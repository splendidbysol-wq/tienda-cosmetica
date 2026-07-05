// admin-productos.js
// Lógica del panel de administración: alta, edición y borrado de productos.
// Las fotos se suben a Cloudinary (ver subida-fotos.js); Firestore solo
// guarda la URL resultante.

import { db } from "./firebase-config.js";
import { comprimirImagen, inicializarCapturaFoto } from "./camara.js";
import { subirFotoACloudinary } from "./subida-fotos.js";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let fotoComprimidaActual = null;
let productoEnEdicionId = null; // null = modo alta, string = modo edición
let urlFotoActualEnEdicion = null;

function mostrarEstado(mensaje, esError = false) {
  const estado = document.getElementById("estado-formulario");
  estado.textContent = mensaje;
  estado.className = esError ? "estado error" : "estado";
}

function mostrarPreview(blob) {
  const preview = document.getElementById("preview-foto");
  preview.src = URL.createObjectURL(blob);
  preview.classList.remove("oculto");
}

function entrarModoEdicion(producto) {
  productoEnEdicionId = producto.id;
  urlFotoActualEnEdicion = producto.urlFoto || null;

  document.getElementById("input-nombre").value = producto.nombre || "";
  document.getElementById("input-precio").value = producto.precio ?? "";
  document.getElementById("input-stock").value = producto.stock ?? "";
  document.getElementById("input-categoria").value = producto.categoria || "";
  document.getElementById("input-descripcion").value = producto.descripcion || "";

  if (producto.urlFoto) {
    document.getElementById("preview-foto").src = producto.urlFoto;
    document.getElementById("preview-foto").classList.remove("oculto");
  }

  fotoComprimidaActual = null; // no hay foto nueva hasta que saquen otra

  document.getElementById("boton-guardar").textContent = "Guardar cambios";
  document.getElementById("boton-cancelar-edicion").classList.remove("oculto");
  mostrarEstado(`Editando "${producto.nombre}". Si no sacás una foto nueva, se mantiene la actual.`);

  document.getElementById("form-producto").scrollIntoView({ behavior: "smooth" });
}

function salirModoEdicion() {
  productoEnEdicionId = null;
  urlFotoActualEnEdicion = null;
  fotoComprimidaActual = null;

  document.getElementById("form-producto").reset();
  document.getElementById("preview-foto").classList.add("oculto");
  document.getElementById("boton-guardar").textContent = "Guardar producto";
  document.getElementById("boton-cancelar-edicion").classList.add("oculto");
  mostrarEstado("");
}

async function guardarProducto(evento) {
  evento.preventDefault();

  const nombre = document.getElementById("input-nombre").value.trim();
  const precio = parseFloat(document.getElementById("input-precio").value);
  const stock = parseInt(document.getElementById("input-stock").value, 10);
  const categoria = document.getElementById("input-categoria").value.trim();
  const descripcion = document.getElementById("input-descripcion").value.trim();

  if (!nombre) return mostrarEstado("Falta el nombre del producto.", true);
  if (isNaN(precio) || precio < 0) return mostrarEstado("El precio no es válido.", true);
  if (isNaN(stock) || stock < 0) return mostrarEstado("El stock no es válido.", true);

  const esEdicion = productoEnEdicionId !== null;

  // En alta, la foto es obligatoria. En edición, es opcional (se puede mantener la actual).
  if (!esEdicion && !fotoComprimidaActual) {
    return mostrarEstado("Sacá una foto del producto primero.", true);
  }

  try {
    let urlFoto = esEdicion ? urlFotoActualEnEdicion : null;

    if (fotoComprimidaActual) {
      mostrarEstado("Subiendo foto...");
      urlFoto = await subirFotoACloudinary(fotoComprimidaActual);
      // Nota: si esto es una edición y había una foto vieja, esa foto queda
      // huérfana en Cloudinary (ver subida-fotos.js). No afecta el catálogo.
    }

    if (esEdicion) {
      mostrarEstado("Guardando cambios...");
      await updateDoc(doc(db, "productos", productoEnEdicionId), {
        nombre,
        precio,
        stock,
        categoria,
        descripcion,
        urlFoto,
        actualizadoEn: serverTimestamp()
      });
      mostrarEstado("✅ Producto actualizado.");
    } else {
      mostrarEstado("Guardando producto...");
      await addDoc(collection(db, "productos"), {
        nombre,
        precio,
        stock,
        categoria,
        descripcion,
        urlFoto,
        activo: true,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp()
      });
      mostrarEstado("✅ Producto guardado con éxito.");
    }

    salirModoEdicion();
  } catch (error) {
    console.error(error);
    mostrarEstado(error.message || "❌ Hubo un error al guardar. Probá de nuevo.", true);
  }
}

async function borrarProducto(producto) {
  const confirmar = window.confirm(`¿Borrar "${producto.nombre}"? Esta acción no se puede deshacer.`);
  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, "productos", producto.id));
    // La foto en Cloudinary no se borra automáticamente (ver subida-fotos.js).
    // Si querés liberar espacio, se puede borrar a mano desde cloudinary.com > Media Library.

    if (productoEnEdicionId === producto.id) {
      salirModoEdicion();
    }
  } catch (error) {
    console.error(error);
    alert("No se pudo borrar el producto. Probá de nuevo.");
  }
}

function renderListaProductos(productos) {
  const contenedor = document.getElementById("lista-productos");

  if (productos.length === 0) {
    contenedor.innerHTML = "<p>Todavía no cargaste ningún producto.</p>";
    return;
  }

  contenedor.innerHTML = productos
    .map(
      (p) => `
      <div class="fila-producto" data-id="${p.id}">
        <img src="${p.urlFoto || "icons/icon-192.png"}" alt="${p.nombre}" />
        <div class="fila-producto-info">
          <strong>${p.nombre}</strong>
          <span>$${p.precio} · stock: ${p.stock}</span>
        </div>
        <div class="fila-producto-acciones">
          <button class="boton-editar" data-id="${p.id}">Editar</button>
          <button class="boton-borrar" data-id="${p.id}">Borrar</button>
        </div>
      </div>
    `
    )
    .join("");

  contenedor.querySelectorAll(".boton-editar").forEach((boton) => {
    boton.addEventListener("click", () => {
      const producto = productos.find((p) => p.id === boton.dataset.id);
      if (producto) entrarModoEdicion(producto);
    });
  });

  contenedor.querySelectorAll(".boton-borrar").forEach((boton) => {
    boton.addEventListener("click", () => {
      const producto = productos.find((p) => p.id === boton.dataset.id);
      if (producto) borrarProducto(producto);
    });
  });
}

function iniciarListadoProductos() {
  const productosRef = collection(db, "productos");
  const q = query(productosRef, orderBy("creadoEn", "desc"));

  onSnapshot(
    q,
    (snapshot) => {
      const productos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderListaProductos(productos);
    },
    (error) => {
      console.error("Error listando productos:", error);
      document.getElementById("lista-productos").innerHTML =
        "<p>No se pudo cargar la lista de productos.</p>";
    }
  );
}

export function iniciarPanelProductos() {
  inicializarCapturaFoto(
    "input-foto",
    (blobComprimido) => {
      fotoComprimidaActual = blobComprimido;
      mostrarPreview(blobComprimido);
      mostrarEstado("Foto lista. Completá los datos y guardá.");
    },
    (error) => mostrarEstado("No se pudo procesar la foto.", true)
  );

  document
    .getElementById("form-producto")
    .addEventListener("submit", guardarProducto);

  document
    .getElementById("boton-cancelar-edicion")
    .addEventListener("click", salirModoEdicion);

  iniciarListadoProductos();
}
