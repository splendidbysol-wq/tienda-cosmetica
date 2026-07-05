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
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { comprimirImagen } from "./camara.js";
import { subirFotoACloudinary } from "./subida-fotos.js";

const contadorCarrito = document.getElementById("contador-carrito");
const itemsCarrito = document.getElementById("items-carrito");
const totalCarritoEl = document.getElementById("total-carrito");

const drawerCarrito = document.getElementById("drawer-carrito");
const fondoDrawer = document.getElementById("fondo-drawer");
const drawerCheckout = document.getElementById("drawer-checkout");
const fondoCheckout = document.getElementById("fondo-checkout");

let datosMercadoPago = null;
let datosEmailJS = null;

async function cargarDatosMercadoPago() {
  try {
    const snapshot = await getDoc(doc(db, "config", "local"));
    if (snapshot.exists()) {
      const config = snapshot.data();
      if (config.aliasMercadoPago) {
        datosMercadoPago = {
          alias: config.aliasMercadoPago,
          titular: config.titularMercadoPago || "",
          cuil: config.cuilMercadoPago || "",
          urlFuncion: config.urlFuncionMercadoPago || null
        };
      }

      if (config.emailjsServiceId && config.emailjsTemplateId && config.emailjsPublicKey) {
        datosEmailJS = {
          serviceId: config.emailjsServiceId,
          templateId: config.emailjsTemplateId,
          publicKey: config.emailjsPublicKey
        };
        // emailjs viene del script cargado en index.html (variable global)
        if (window.emailjs) {
          window.emailjs.init(datosEmailJS.publicKey);
        }
      }
    }
  } catch (error) {
    console.warn("No se pudo cargar la configuración de pagos/avisos:", error);
  }
}

function actualizarNotaMetodoPago() {
  const metodo = document.getElementById("checkout-metodo-pago").value;
  const nota = document.getElementById("nota-metodo-pago");

  if (metodo === "mercadopago" && datosMercadoPago?.urlFuncion) {
    nota.innerHTML = `Al confirmar, te vamos a redirigir a Mercado Pago para pagar con tarjeta, dinero en cuenta, o QR.`;
    nota.classList.remove("oculto");
  } else if (metodo === "mercadopago" && datosMercadoPago) {
    nota.innerHTML = `
      Transferí el total a este alias de Mercado Pago:<br />
      <strong>${datosMercadoPago.alias}</strong><br />
      ${datosMercadoPago.titular ? `Titular: ${datosMercadoPago.titular}<br />` : ""}
      ${datosMercadoPago.cuil ? `CUIL/CUIT: ${datosMercadoPago.cuil}<br />` : ""}
      Guardá el comprobante para mostrarlo al recibir tu pedido.
    `;
    nota.classList.remove("oculto");
  } else {
    nota.classList.add("oculto");
  }
}

async function subirComprobanteSiHay() {
  const input = document.getElementById("checkout-comprobante");
  const archivo = input.files[0];
  if (!archivo) return null;

  const blob = await comprimirImagen(archivo, 1000, 0.75, "image/jpeg");
  return subirFotoACloudinary(blob);
}

async function avisarPorMail({ idPedido, datosCliente, metodoPago, total, urlComprobante }) {
  if (!datosEmailJS || !window.emailjs) return; // no configurado, no rompemos el flujo

  try {
    await window.emailjs.send(datosEmailJS.serviceId, datosEmailJS.templateId, {
      pedido_id: idPedido.slice(0, 6),
      cliente_nombre: datosCliente.nombre,
      cliente_telefono: datosCliente.telefono,
      cliente_direccion: datosCliente.direccion || "(retira / sin dirección)",
      metodo_pago: metodoPago,
      total: `$${total}`,
      comprobante_url: urlComprobante || "No adjuntó comprobante"
    });
  } catch (error) {
    // Si falla el mail, no le arruinamos la compra al cliente — el pedido
    // ya quedó guardado en Firestore de todas formas.
    console.warn("No se pudo enviar el aviso por mail:", error);
  }
}

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

    let urlComprobante = null;
    try {
      urlComprobante = await subirComprobanteSiHay();
    } catch (error) {
      console.warn("No se pudo subir el comprobante, se sigue sin él:", error);
    }

    const { id: idPedido, total } = await confirmarPedido(datosCliente, metodoPago, urlComprobante);

    // Aviso por mail al vendedor (si está configurado). No bloqueamos el
    // flujo si esto falla — el pedido ya quedó guardado de todas formas.
    avisarPorMail({ idPedido, datosCliente, metodoPago, total, urlComprobante });

    // Si hay una función de cobro automático configurada y el cliente
    // eligió Mercado Pago, lo mandamos a pagar de verdad en vez de
    // solo mostrarle el alias.
    if (metodoPago === "mercadopago" && datosMercadoPago?.urlFuncion) {
      mostrarEstadoCheckout("Redirigiendo a Mercado Pago...");

      const respuesta = await fetch(datosMercadoPago.urlFuncion, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total,
          pedidoId: idPedido,
          descripcion: `Pedido ${idPedido.slice(0, 6)}`
        })
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.initPoint) {
        window.location.href = datos.initPoint;
        return; // el navegador se va a Mercado Pago, no seguimos acá
      } else {
        console.error("Error creando el link de pago:", datos);
        mostrarEstadoCheckout(
          `✅ Pedido Nº ${idPedido.slice(0, 6)} guardado, pero no pudimos generar el link de pago. Contactanos para coordinar.`,
          true
        );
        document.getElementById("form-checkout").reset();
        return;
      }
    }

    mostrarEstadoCheckout(`✅ ¡Pedido confirmado! Nº ${idPedido.slice(0, 6)}`);
    document.getElementById("form-checkout").reset();
    document.getElementById("nota-metodo-pago").classList.add("oculto");

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
document.getElementById("checkout-metodo-pago").addEventListener("change", actualizarNotaMetodoPago);

cargarDatosMercadoPago();
renderCarrito();
