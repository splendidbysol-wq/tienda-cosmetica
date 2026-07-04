// carrito.js
// Manejo del estado del carrito. Se guarda en localStorage para que
// sobreviva si el cliente cierra el navegador o recarga la página
// (a diferencia de un artifact de demo, esta es una app real desplegada,
// así que localStorage es la herramienta correcta acá).

const CLAVE_CARRITO = "carrito-compras";

function obtenerCarrito() {
  const guardado = localStorage.getItem(CLAVE_CARRITO);
  return guardado ? JSON.parse(guardado) : [];
}

function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  // Avisamos a quien esté escuchando (el ícono del carrito, el drawer, etc.)
  window.dispatchEvent(new CustomEvent("carrito-actualizado", { detail: carrito }));
}

export function agregarAlCarrito(producto, cantidad = 1) {
  const carrito = obtenerCarrito();
  const existente = carrito.find((item) => item.productoId === producto.id);

  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      urlFoto: producto.urlFoto || null,
      cantidad
    });
  }

  guardarCarrito(carrito);
}

export function cambiarCantidad(productoId, nuevaCantidad) {
  let carrito = obtenerCarrito();

  if (nuevaCantidad <= 0) {
    carrito = carrito.filter((item) => item.productoId !== productoId);
  } else {
    const item = carrito.find((i) => i.productoId === productoId);
    if (item) item.cantidad = nuevaCantidad;
  }

  guardarCarrito(carrito);
}

export function quitarDelCarrito(productoId) {
  const carrito = obtenerCarrito().filter((item) => item.productoId !== productoId);
  guardarCarrito(carrito);
}

export function vaciarCarrito() {
  guardarCarrito([]);
}

export function calcularTotal(carrito) {
  return carrito.reduce((total, item) => total + item.precio * item.cantidad, 0);
}

export function obtenerCantidadTotal(carrito) {
  return carrito.reduce((total, item) => total + item.cantidad, 0);
}

export { obtenerCarrito };
