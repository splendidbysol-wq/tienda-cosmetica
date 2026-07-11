// admin-pedidos.js
// Listado de todos los pedidos, con el detalle completo de cada uno y la
// posibilidad de cambiar el estado a mano (mientras no esté activado el
// cobro automático de Mercado Pago, esto es la única forma de marcar un
// pedido como confirmado/entregado).

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ESTADOS = ["pendiente", "confirmado", "en_preparacion", "enviado", "entregado", "cancelado"];

const ETIQUETAS_ESTADO = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado"
};

const ETIQUETAS_PAGO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago"
};

function formatearFecha(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Devuelve al stock las unidades de un pedido cancelado. Se guarda un
 * flag (stockDevuelto) en el pedido para no devolverlo dos veces si lo
 * cancelan, lo cambian, y lo vuelven a cancelar.
 */
async function devolverStockSiCorresponde(pedido) {
  if (pedido.stockDevuelto) return;

  try {
    await runTransaction(db, async (transaction) => {
      const productos = pedido.productos || [];
      const lecturas = [];

      for (const item of productos) {
        if (!item.productoId) continue;
        const ref = doc(db, "productos", item.productoId);
        const snap = await transaction.get(ref);
        if (snap.exists()) {
          lecturas.push({ ref, stockActual: snap.data().stock ?? 0, cantidad: item.cantidad || 0 });
        }
      }

      for (const { ref, stockActual, cantidad } of lecturas) {
        transaction.update(ref, { stock: stockActual + cantidad, actualizadoEn: serverTimestamp() });
      }

      transaction.update(doc(db, "pedidos", pedido.id), { stockDevuelto: true });
    });
  } catch (error) {
    console.error("No se pudo devolver el stock del pedido cancelado:", error);
  }
}

/**
 * Elimina un pedido para siempre. Si el stock de ese pedido todavía no
 * había sido devuelto (por ejemplo, se borra sin haberlo cancelado antes),
 * lo devuelve como parte de la misma operación, para no perder mercadería.
 */
async function eliminarPedido(pedido) {
  const confirmar = window.confirm(
    `¿Eliminar el pedido #${pedido.id.slice(0, 6)} para siempre? Esta acción no se puede deshacer.`
  );
  if (!confirmar) return;

  try {
    await runTransaction(db, async (transaction) => {
      if (!pedido.stockDevuelto) {
        const productos = pedido.productos || [];
        const lecturas = [];

        for (const item of productos) {
          if (!item.productoId) continue;
          const ref = doc(db, "productos", item.productoId);
          const snap = await transaction.get(ref);
          if (snap.exists()) {
            lecturas.push({ ref, stockActual: snap.data().stock ?? 0, cantidad: item.cantidad || 0 });
          }
        }

        for (const { ref, stockActual, cantidad } of lecturas) {
          transaction.update(ref, { stock: stockActual + cantidad, actualizadoEn: serverTimestamp() });
        }
      }

      transaction.delete(doc(db, "pedidos", pedido.id));
    });
  } catch (error) {
    console.error("No se pudo eliminar el pedido:", error);
    alert("No se pudo eliminar el pedido. Probá de nuevo.");
  }
}

function renderPedidos(pedidos) {
  const contenedor = document.getElementById("lista-pedidos");

  if (pedidos.length === 0) {
    contenedor.innerHTML = "<p>Todavía no hay pedidos.</p>";
    return;
  }

  contenedor.innerHTML = pedidos
    .map((p) => {
      const productosTexto = (p.productos || [])
        .map((item) => `${item.cantidad}x ${item.nombre}`)
        .join(", ");

      const entregaTexto = p.envioACoordinar
        ? "Envío a coordinar"
        : p.metodoEntrega === "envio"
        ? `Envío a domicilio${p.costoEnvio ? ` ($${p.costoEnvio})` : " (gratis)"}`
        : "Retira en el local";

      return `
        <div class="tarjeta-pedido" data-id="${p.id}">
          <div class="tarjeta-pedido-header">
            <strong>#${p.id.slice(0, 6)}</strong>
            <span class="tarjeta-pedido-fecha">${formatearFecha(p.creadoEn)}</span>
          </div>

          <p><strong>${p.cliente?.nombre || "(sin nombre)"}</strong> · ${p.cliente?.telefono || ""}</p>
          ${p.cliente?.direccion ? `<p class="tarjeta-pedido-chico">${p.cliente.direccion}</p>` : ""}

          <p class="tarjeta-pedido-chico">${productosTexto}</p>
          <p class="tarjeta-pedido-chico">${entregaTexto} · ${ETIQUETAS_PAGO[p.metodoPago] || p.metodoPago}</p>

          ${
            p.comprobanteUrl
              ? `<a href="${p.comprobanteUrl}" target="_blank" rel="noopener" class="tarjeta-pedido-comprobante">Ver comprobante 📎</a>`
              : ""
          }
          ${p.stockDevuelto ? `<p class="tarjeta-pedido-chico">✅ Stock devuelto al cancelar</p>` : ""}

          <div class="tarjeta-pedido-footer">
            <strong class="tarjeta-pedido-total">$${p.total}</strong>
            <div class="tarjeta-pedido-acciones">
              <select class="selector-estado" data-id="${p.id}">
                ${ESTADOS.map(
                  (estado) =>
                    `<option value="${estado}" ${p.estado === estado ? "selected" : ""}>${ETIQUETAS_ESTADO[estado]}</option>`
                ).join("")}
              </select>
              <button class="boton-borrar-pedido" data-id="${p.id}" title="Eliminar pedido">🗑</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  contenedor.querySelectorAll(".selector-estado").forEach((select) => {
    select.addEventListener("change", async () => {
      const pedido = pedidos.find((p) => p.id === select.dataset.id);
      const nuevoEstado = select.value;
      const eraCancelado = pedido?.estado === "cancelado";

      try {
        await updateDoc(doc(db, "pedidos", select.dataset.id), {
          estado: nuevoEstado,
          actualizadoEn: serverTimestamp()
        });

        if (nuevoEstado === "cancelado" && !eraCancelado && pedido) {
          await devolverStockSiCorresponde(pedido);
        }
      } catch (error) {
        console.error("No se pudo actualizar el estado:", error);
        alert("No se pudo actualizar el estado del pedido. Probá de nuevo.");
      }
    });
  });

  contenedor.querySelectorAll(".boton-borrar-pedido").forEach((boton) => {
    boton.addEventListener("click", () => {
      const pedido = pedidos.find((p) => p.id === boton.dataset.id);
      if (pedido) eliminarPedido(pedido);
    });
  });
}

export function iniciarPedidos() {
  const pedidosRef = collection(db, "pedidos");
  const q = query(pedidosRef, orderBy("creadoEn", "desc"));

  onSnapshot(
    q,
    (snapshot) => {
      const pedidos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderPedidos(pedidos);
    },
    (error) => {
      console.error("Error cargando pedidos:", error);
      document.getElementById("lista-pedidos").innerHTML = "<p>No se pudo cargar la lista de pedidos.</p>";
    }
  );
}
