// admin-informes.js
// Dos informes simples y útiles para el día a día del vendedor:
// 1. Qué productos tienen poco stock (para saber qué reponer)
// 2. Qué productos se venden más (sumando todos los pedidos históricos)

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const UMBRAL_STOCK_BAJO = 3; // productos con este stock o menos aparecen en el aviso

function renderStockBajo(productos) {
  const contenedor = document.getElementById("informe-stock-bajo");

  if (productos.length === 0) {
    contenedor.innerHTML = "<p class='informe-ok'>Todo con buen stock por ahora.</p>";
    return;
  }

  contenedor.innerHTML = `
    <ul class="lista-informe">
      ${productos
        .map(
          (p) => `
        <li>
          <span>${p.nombre}</span>
          <strong class="${p.stock === 0 ? "sin-stock" : ""}">${p.stock === 0 ? "Agotado" : `${p.stock} u.`}</strong>
        </li>
      `
        )
        .join("")}
    </ul>
  `;
}

function iniciarStockBajo() {
  const productosRef = collection(db, "productos");
  const q = query(productosRef, where("stock", "<=", UMBRAL_STOCK_BAJO), orderBy("stock", "asc"));

  onSnapshot(
    q,
    (snapshot) => {
      const productos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderStockBajo(productos);
    },
    (error) => {
      console.error("Error cargando informe de stock:", error);
      document.getElementById("informe-stock-bajo").innerHTML =
        "<p>No se pudo cargar este informe.</p>";
    }
  );
}

function renderMasVendidos(ranking) {
  const contenedor = document.getElementById("informe-mas-vendidos");

  if (ranking.length === 0) {
    contenedor.innerHTML = "<p>Todavía no hay pedidos suficientes para armar un ranking.</p>";
    return;
  }

  contenedor.innerHTML = `
    <ol class="lista-informe lista-ranking">
      ${ranking
        .map(
          (item) => `
        <li>
          <span>${item.nombre}</span>
          <strong>${item.unidades} u. vendidas</strong>
        </li>
      `
        )
        .join("")}
    </ol>
  `;
}

function iniciarMasVendidos() {
  const pedidosRef = collection(db, "pedidos");

  // Solo contamos pedidos que no fueron cancelados, para no inflar el ranking
  const q = query(pedidosRef, where("estado", "!=", "cancelado"));

  onSnapshot(
    q,
    (snapshot) => {
      const conteoPorProducto = {}; // { productoId: { nombre, unidades } }

      snapshot.docs.forEach((docPedido) => {
        const productos = docPedido.data().productos || [];
        productos.forEach((item) => {
          const clave = item.productoId || item.nombre;
          if (!conteoPorProducto[clave]) {
            conteoPorProducto[clave] = { nombre: item.nombre, unidades: 0 };
          }
          conteoPorProducto[clave].unidades += item.cantidad || 0;
        });
      });

      const ranking = Object.values(conteoPorProducto)
        .sort((a, b) => b.unidades - a.unidades)
        .slice(0, 5); // top 5

      renderMasVendidos(ranking);
    },
    (error) => {
      console.error("Error cargando informe de más vendidos:", error);
      document.getElementById("informe-mas-vendidos").innerHTML =
        "<p>No se pudo cargar este informe.</p>";
    }
  );
}

export function iniciarInformes() {
  iniciarStockBajo();
  iniciarMasVendidos();
}
