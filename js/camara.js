// camara.js
// Captura de foto desde la cámara + compresión automática antes de subir.
// No usa librerías externas: la compresión se hace con <canvas>, que es
// nativo del navegador y funciona bien en Safari iOS.

/**
 * Encuentra el rectángulo donde realmente hay contenido visible (no
 * transparente) dentro de un canvas, para poder recortar el aire sobrante.
 * Devuelve un canvas nuevo ya recortado, o null si no encontró nada para recortar.
 */
function recortarTransparencia(canvasOriginal) {
  const { width, height } = canvasOriginal;
  const ctx = canvasOriginal.getContext("2d");
  const { data } = ctx.getImageData(0, 0, width, height);

  const UMBRAL_ALPHA = 10; // píxeles con alpha menor a esto se consideran "aire"
  let minX = width, minY = height, maxX = 0, maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > UMBRAL_ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null; // imagen vacía, no tocar

  // Dejamos un pequeño margen de aire (4% del lado más grande) para que
  // no quede pegado al borde.
  const margen = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  const x0 = Math.max(0, minX - margen);
  const y0 = Math.max(0, minY - margen);
  const x1 = Math.min(width, maxX + margen);
  const y1 = Math.min(height, maxY + margen);
  const anchoRecorte = x1 - x0;
  const altoRecorte = y1 - y0;

  const canvasRecortado = document.createElement("canvas");
  canvasRecortado.width = anchoRecorte;
  canvasRecortado.height = altoRecorte;
  canvasRecortado.getContext("2d").drawImage(
    canvasOriginal, x0, y0, anchoRecorte, altoRecorte, 0, 0, anchoRecorte, altoRecorte
  );
  return canvasRecortado;
}

/**
 * Comprime una imagen redimensionándola y bajando su calidad.
 * Si es PNG, además recorta automáticamente el espacio transparente
 * sobrante (típico en logos generados por IA, que suelen venir con
 * mucho margen alrededor del diseño real).
 * @param {File} archivo - archivo de imagen original (de la cámara o selector)
 * @param {number} anchoMaximo - ancho máximo en píxeles (alto se ajusta proporcional)
 * @param {number} calidad - 0 a 1, solo aplica a JPEG (0.7-0.8 es buen balance)
 * @param {string} formato - "image/jpeg" (por defecto, para fotos) o "image/png"
 *                           (para logos/gráficos que necesitan fondo transparente)
 * @returns {Promise<Blob>} imagen comprimida
 */
export function comprimirImagen(archivo, anchoMaximo = 800, calidad = 0.75, formato = "image/jpeg") {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    const lector = new FileReader();

    lector.onload = (e) => {
      imagen.src = e.target.result;
    };

    imagen.onload = () => {
      try {
        // Canvas a tamaño natural, para poder analizar y recortar antes de redimensionar
        const canvasNatural = document.createElement("canvas");
        canvasNatural.width = imagen.naturalWidth;
        canvasNatural.height = imagen.naturalHeight;
        canvasNatural.getContext("2d").drawImage(imagen, 0, 0);

        let fuente = canvasNatural;
        if (formato === "image/png") {
          const recortado = recortarTransparencia(canvasNatural);
          if (recortado) fuente = recortado;
        }

        let width = fuente.width;
        let height = fuente.height;
        if (width > anchoMaximo) {
          height = Math.round((height * anchoMaximo) / width);
          width = anchoMaximo;
        }

        const canvasFinal = document.createElement("canvas");
        canvasFinal.width = width;
        canvasFinal.height = height;
        canvasFinal.getContext("2d").drawImage(fuente, 0, 0, width, height);

        canvasFinal.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("No se pudo comprimir la imagen"));
            }
          },
          formato,
          formato === "image/jpeg" ? calidad : undefined
        );
      } catch (error) {
        reject(error);
      }
    };

    imagen.onerror = () => reject(new Error("No se pudo leer la imagen"));
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));

    lector.readAsDataURL(archivo);
  });
}

/**
 * Conecta el input de cámara con la compresión y devuelve el blob listo para subir.
 * Uso típico:
 *   <input type="file" accept="image/*" capture="environment" id="input-foto">
 *   inicializarCapturaFoto('input-foto', (blobComprimido) => { ... subir a Storage ... });
 */
export function inicializarCapturaFoto(idInput, callbackListo, callbackError) {
  const input = document.getElementById(idInput);

  input.addEventListener("change", async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    try {
      const pesoOriginalKB = Math.round(archivo.size / 1024);
      const blobComprimido = await comprimirImagen(archivo);
      const pesoFinalKB = Math.round(blobComprimido.size / 1024);

      console.log(
        `Foto comprimida: ${pesoOriginalKB}KB → ${pesoFinalKB}KB`
      );

      callbackListo(blobComprimido);
    } catch (error) {
      console.error("Error al procesar la foto:", error);
      if (callbackError) callbackError(error);
    }
  });
}
