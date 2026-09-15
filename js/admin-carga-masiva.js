// admin-carga-masiva.js
// Permite cargar muchos productos de una vez, completando una planilla
// (Excel o CSV) en vez de tener que usar el formulario uno por uno.
// Las fotos NO se cargan acá (una planilla no puede traer fotos) — el
// producto queda con el ícono genérico hasta que alguien le agregue una
// foto más adelante, editándolo desde "Mis productos".

import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const COLUMNAS_ESPERADAS = ["nombre", "precio", "stock", "categoria", "descripcion"];

let filasParaImportar = [];

function mostrarEstado(mensaje, esError = false) {
  const estado = document.getElementById("estado-carga-masiva");
  estado.textContent = mensaje;
  estado.className = esError ? "estado error" : "estado";
}

function descargarPlantilla() {
  const datosEjemplo = [
    {
      nombre: "Labial mate rojo",
      precio: 5000,
      stock: 10,
      categoria: "cosmetica",
      descripcion: "Labial de larga duración, acabado mate, tono rojo clásico."
    },
    {
      nombre: "Base líquida natural",
      precio: 8500,
      stock: 5,
      categoria: "cosmetica",
      descripcion: "Cobertura media, acabado natural, apta para piel sensible."
    }
  ];

  const hoja = XLSX.utils.json_to_sheet(datosEjemplo);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Productos");
  XLSX.writeFile(libro, "plantilla-productos.xlsx");
}

/**
 * Valida y normaliza las filas leídas del archivo. Filas sin nombre o
 * sin precio válido se descartan (se informan como error, no se importan).
 */
function procesarFilas(filasCrudas) {
  const validas = [];
  const errores = [];

  filasCrudas.forEach((fila, indice) => {
    const numeroFila = indice + 2; // +2 porque la fila 1 es el encabezado

    // Normalizamos nombres de columnas por si vienen con mayúsculas/espacios
    const normalizada = {};
    Object.keys(fila).forEach((clave) => {
      normalizada[clave.trim().toLowerCase()] = fila[clave];
    });

    const nombre = String(normalizada.nombre || "").trim();
    const precio = parseFloat(normalizada.precio);
    const stock = parseInt(normalizada.stock, 10);
    const categoria = String(normalizada.categoria || "").trim();
    const descripcion = String(normalizada.descripcion || "").trim();

    if (!nombre) {
      errores.push(`Fila ${numeroFila}: falta el nombre, se salteó.`);
      return;
    }
    if (isNaN(precio) || precio < 0) {
      errores.push(`Fila ${numeroFila} ("${nombre}"): precio inválido, se salteó.`);
      return;
    }

    validas.push({
      nombre,
      precio,
      stock: isNaN(stock) ? 0 : stock,
      categoria,
      descripcion
    });
  });

  return { validas, errores };
}

function manejarArchivoSeleccionado(evento) {
  const archivo = evento.target.files[0];
  if (!archivo) return;

  mostrarEstado("Leyendo archivo...");

  const lector = new FileReader();
  lector.onload = (e) => {
    try {
      const datos = new Uint8Array(e.target.result);
      const libro = XLSX.read(datos, { type: "array" });
      const primeraHoja = libro.Sheets[libro.SheetNames[0]];
      const filasCrudas = XLSX.utils.sheet_to_json(primeraHoja);

      const { validas, errores } = procesarFilas(filasCrudas);
      filasParaImportar = validas;

      const vistaPrevia = document.getElementById("vista-previa-carga-masiva");
      const resumen = document.getElementById("resumen-carga-masiva");

      if (validas.length === 0) {
        mostrarEstado("No se encontró ningún producto válido en ese archivo.", true);
        vistaPrevia.classList.add("oculto");
        return;
      }

      let textoResumen = `Se van a importar ${validas.length} producto(s): ${validas
        .slice(0, 5)
        .map((p) => p.nombre)
        .join(", ")}${validas.length > 5 ? "..." : ""}.`;

      if (errores.length > 0) {
        textoResumen += ` (${errores.length} fila(s) con problemas, no se van a importar — mirá la consola para el detalle).`;
        console.warn("Errores en la planilla:", errores);
      }

      resumen.textContent = textoResumen;
      vistaPrevia.classList.remove("oculto");
      mostrarEstado("");
    } catch (error) {
      console.error(error);
      mostrarEstado("No se pudo leer el archivo. Verificá que sea un .xlsx, .xls o .csv válido.", true);
    }
  };

  lector.readAsArrayBuffer(archivo);
}

async function confirmarImportacion() {
  if (filasParaImportar.length === 0) return;

  const boton = document.getElementById("boton-confirmar-carga-masiva");
  boton.disabled = true;

  let importados = 0;
  for (const producto of filasParaImportar) {
    try {
      mostrarEstado(`Importando ${importados + 1} de ${filasParaImportar.length}...`);
      await addDoc(collection(db, "productos"), {
        ...producto,
        urlFoto: null,
        activo: true,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });
      importados++;
    } catch (error) {
      console.error(`No se pudo importar "${producto.nombre}":`, error);
    }
  }

  mostrarEstado(`✅ Se importaron ${importados} de ${filasParaImportar.length} productos.`);
  document.getElementById("vista-previa-carga-masiva").classList.add("oculto");
  document.getElementById("input-carga-masiva").value = "";
  filasParaImportar = [];
  boton.disabled = false;
}

export function iniciarCargaMasiva() {
  document.getElementById("boton-descargar-plantilla").addEventListener("click", descargarPlantilla);
  document.getElementById("input-carga-masiva").addEventListener("change", manejarArchivoSeleccionado);
  document.getElementById("boton-confirmar-carga-masiva").addEventListener("click", confirmarImportacion);
}
