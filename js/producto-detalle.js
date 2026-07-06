// producto-detalle.js
// Muestra el detalle completo de un producto (sin recortar la descripción)
// en un modal, cuando se toca la foto/nombre/descripción en el catálogo.

const fondoDetalle = document.getElementById("fondo-detalle");
const modalDetalle = document.getElementById("modal-detalle");
const botonAgregar = document.getElementById("detalle-boton-agregar");

let productoActual = null;

function abrirDetalle(producto) {
  productoActual = producto;

  document.getElementById("detalle-foto").src = producto.urlFoto || "icons/icon-192.png";
  document.getElementById("detalle-foto").alt = producto.nombre;
  document.getElementById("detalle-nombre").textContent = producto.nombre;
  document.getElementById("detalle-precio").textContent = `$${producto.precio}`;
  document.getElementById("detalle-descripcion").textContent =
    producto.descripcion || "Sin descripción.";

  const sinStock = (producto.stock ?? 0) <= 0;
  document.getElementById("detalle-sin-stock").classList.toggle("oculto", !sinStock);
  botonAgregar.disabled = sinStock;
  botonAgregar.textContent = sinStock ? "Sin stock" : "Agregar al carrito";

  modalDetalle.classList.remove("oculto");
  fondoDetalle.classList.remove("oculto");
}

function cerrarDetalle() {
  modalDetalle.classList.add("oculto");
  fondoDetalle.classList.add("oculto");
  productoActual = null;
}

window.addEventListener("ver-producto", (evento) => abrirDetalle(evento.detail));

document.getElementById("boton-cerrar-detalle").addEventListener("click", cerrarDetalle);
fondoDetalle.addEventListener("click", cerrarDetalle);

botonAgregar.addEventListener("click", () => {
  if (!productoActual) return;

  window.dispatchEvent(
    new CustomEvent("agregar-al-carrito", {
      detail: {
        id: productoActual.id,
        nombre: productoActual.nombre,
        precio: productoActual.precio,
        urlFoto: productoActual.urlFoto || null
      }
    })
  );

  cerrarDetalle();
});
