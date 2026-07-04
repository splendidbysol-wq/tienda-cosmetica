// camara.js
// Captura de foto desde la cámara + compresión automática antes de subir.
// No usa librerías externas: la compresión se hace con <canvas>, que es
// nativo del navegador y funciona bien en Safari iOS.

/**
 * Comprime una imagen redimensionándola y bajando su calidad.
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
      let { width, height } = imagen;

      // Redimensionar manteniendo proporción si excede el ancho máximo
      if (width > anchoMaximo) {
        height = Math.round((height * anchoMaximo) / width);
        width = anchoMaximo;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(imagen, 0, 0, width, height);

      // El parámetro de calidad solo tiene efecto en JPEG; en PNG se ignora
      // (PNG es sin pérdida, así que mantiene la transparencia intacta).
      canvas.toBlob(
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
