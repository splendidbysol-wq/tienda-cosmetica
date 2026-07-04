// productos.js
// Lectura del catálogo público desde Firestore y render en el DOM.

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const contenedorCatalogo = document.getElementById("catalogo");

function renderProductos(productos) {
  if (productos.length === 0) {
    contenedorCatalogo.innerHTML = "<p>Todavía no hay productos cargados.</p>";
    return;
  }

  contenedorCatalogo.innerHTML = productos
    .map((p) => {
      const sinStock = (p.stock ?? 0) <= 0;
      return `
      <article class="producto-card" data-id="${p.id}">
        <img src="${p.urlFoto || "icons/icon-192.png"}" alt="${p.nombre}" />
        <h3>${p.nombre}</h3>
        <p class="precio">$${p.precio}</p>
        ${sinStock ? '<p class="sin-stock">Sin stock</p>' : ""}
        <button
          class="boton-agregar-carrito"
          data-id="${p.id}"
          data-nombre="${p.nombre}"
          data-precio="${p.precio}"
          data-foto="${p.urlFoto || ""}"
          ${sinStock ? "disabled" : ""}
        >
          Agregar al carrito
        </button>
      </article>
    `;
    })
    .join("");

  // Conectar los botones recién renderizados con el carrito
  contenedorCatalogo.querySelectorAll(".boton-agregar-carrito").forEach((boton) => {
    boton.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("agregar-al-carrito", {
          detail: {
            id: boton.dataset.id,
            nombre: boton.dataset.nombre,
            precio: parseFloat(boton.dataset.precio),
            urlFoto: boton.dataset.foto || null
          }
        })
      );
    });
  });
}

function iniciarCatalogo() {
  const productosRef = collection(db, "productos");
  const q = query(productosRef, where("activo", "==", true));

  // onSnapshot: el catálogo se actualiza solo si el vendedor
  // agrega/edita productos, sin que el cliente tenga que refrescar.
  onSnapshot(
    q,
    (snapshot) => {
      const productos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      renderProductos(productos);
    },
    (error) => {
      console.error("Error cargando catálogo:", error);
      contenedorCatalogo.innerHTML =
        "<p>No se pudo cargar el catálogo. Probá de nuevo en un momento.</p>";
    }
  );
}

iniciarCatalogo();
