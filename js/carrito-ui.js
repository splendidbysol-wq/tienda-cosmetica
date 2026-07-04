// carrito-ui.js
// Conecta el catálogo con el carrito: escucha "agregar-al-carrito",
// dibuja el drawer, permite cambiar cantidades, y dispara el checkout.

import {
  agregarAlCarrito,
  cambiarCantidad,
  quitarDelCarrito,
  obtenerCarrito,
  calcularTotal,
  obtenerCantidadTotal
} from "./carrito.js";
import { confirmarPedido } from "./checkout.js";

const contadorCarrito = document.getElementById("contador-carrito");
const itemsCarrito = document.getElementById("items-carrito");
const totalCarritoEl = document.getElementById("total-carrito");

const drawerCarrito = document.getElementById("drawer-carrito");
const fondoDrawer = document.getElementById("fondo-drawer");
const drawerCheckout = document.getElementById("drawer-checkout");
const fondoCheckout = document.getElementById("fondo-checkout");

function renderCarrito() {
  const carrito = obtenerCarrito();
  contadorCarrito.textContent = obtenerCantidadTotal(carrito);
  totalCarritoEl.textContent = `$${calcularTotal(carrito)}`;

  if (carrito.length === 0) {
    itemsCarrito.innerHTML = "<p>Tu carrito está vacío.</p>";
    return;
  }

  itemsCarrito.innerHTML = carrito
    .map(
      (item) => `
      <div class="item-carrito" data-id="${item.productoId}">
        <img src="${item.urlFoto || "icons/icon-192.png"}" alt="${item.nombre}" />
        <div class="item-carrito-info">
          <strong>${item.nombre}</strong>
          <span>$${item.precio} c/u</span>
        </div>
        <div class="item-carrito-cantidad">
          <button class="boton-restar" data-id="${item.productoId}">-</button>
          <span>${item.cantidad}</span>
          <button class="boton-sumar" data-id="${item.productoId}">+</button>
        </div>
        <button class="boton-quitar" data-id="${item.productoId}">🗑</button>
      </div>
    `
    )
    .join("");

  itemsCarrito.querySelectorAll(".boton-sumar").forEach((b) =>
    b.addEventListener("click", () => {
      const carritoActual = obtenerCarrito();
      const item = carritoActual.find((i) => i.productoId === b.dataset.id);
      cambiarCantidad(b.dataset.id, item.cantidad + 1);
    })
  );

  itemsCarrito.querySelectorAll(".boton-restar").forEach((b) =>
    b.addEventListener("click", () => {
      const carritoActual = obtenerCarrito();
      const item = carritoActual.find((i) => i.productoId === b.dataset.id);
      cambiarCantidad(b.dataset.id, item.cantidad - 1);
    })
  );

  itemsCarrito.querySelectorAll(".boton-quitar").forEach((b) =>
    b.addEventListener("click", () => quitarDelCarrito(b.dataset.id))
  );
}

function abrirDrawerCarrito() {
  drawerCarrito.classList.remove("oculto");
  fondoDrawer.classList.remove("oculto");
}

function cerrarDrawerCarrito() {
  drawerCarrito.classList.add("oculto");
  fondoDrawer.classList.add("oculto");
}

function abrirCheckout() {
  const carrito = obtenerCarrito();
  if (carrito.length === 0) return;

  cerrarDrawerCarrito();
  drawerCheckout.classList.remove("oculto");
  fondoCheckout.classList.remove("oculto");
}

function cerrarCheckout() {
  drawerCheckout.classList.add("oculto");
  fondoCheckout.classList.add("oculto");
}

function mostrarEstadoCheckout(mensaje, esError = false) {
  const estado = document.getElementById("estado-checkout");
  estado.textContent = mensaje;
  estado.className = esError ? "estado error" : "estado";
}

async function manejarSubmitCheckout(evento) {
  evento.preventDefault();

  const datosCliente = {
    nombre: document.getElementById("checkout-nombre").value.trim(),
    telefono: document.getElementById("checkout-telefono").value.trim(),
    direccion: document.getElementById("checkout-direccion").value.trim()
  };
  const metodoPago = document.getElementById("checkout-metodo-pago").value;

  if (!datosCliente.nombre || !datosCliente.telefono) {
    return mostrarEstadoCheckout("Completá nombre y teléfono.", true);
  }

  try {
    mostrarEstadoCheckout("Confirmando pedido...");
    const idPedido = await confirmarPedido(datosCliente, metodoPago);

    mostrarEstadoCheckout(`✅ ¡Pedido confirmado! Nº ${idPedido.slice(0, 6)}`);
    document.getElementById("form-checkout").reset();

    setTimeout(() => {
      cerrarCheckout();
      mostrarEstadoCheckout("");
    }, 2500);
  } catch (error) {
    console.error(error);
    mostrarEstadoCheckout(error.message || "No se pudo confirmar el pedido.", true);
  }
}

// Escuchar cuando el catálogo agrega un producto
window.addEventListener("agregar-al-carrito", (evento) => {
  agregarAlCarrito({
    id: evento.detail.id,
    nombre: evento.detail.nombre,
    precio: evento.detail.precio,
    urlFoto: evento.detail.urlFoto
  });
  abrirDrawerCarrito();
});

// Re-renderizar cada vez que cambia el carrito
window.addEventListener("carrito-actualizado", renderCarrito);

document.getElementById("boton-abrir-carrito").addEventListener("click", abrirDrawerCarrito);
document.getElementById("boton-cerrar-carrito").addEventListener("click", cerrarDrawerCarrito);
document.getElementById("fondo-drawer").addEventListener("click", cerrarDrawerCarrito);

document.getElementById("boton-ir-checkout").addEventListener("click", abrirCheckout);
document.getElementById("boton-cerrar-checkout").addEventListener("click", cerrarCheckout);
document.getElementById("fondo-checkout").addEventListener("click", cerrarCheckout);

document.getElementById("form-checkout").addEventListener("submit", manejarSubmitCheckout);

renderCarrito();
