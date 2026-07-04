// admin-config.js
// Panel donde el vendedor cambia nombre, color de marca, logo y foto de
// fondo del catálogo — sin tocar Firestore ni código. Todo se guarda en
// el documento config/local, que tema.js lee del lado del catálogo.

import { db } from "./firebase-config.js";
import { comprimirImagen } from "./camara.js";
import { subirFotoACloudinary } from "./subida-fotos.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let logoNuevo = null; // blob comprimido, si el usuario eligió uno nuevo
let heroNuevo = null;

function mostrarEstado(mensaje, esError = false) {
  const estado = document.getElementById("estado-config");
  estado.textContent = mensaje;
  estado.className = esError ? "estado error" : "estado";
}

async function cargarConfigActual() {
  try {
    const snapshot = await getDoc(doc(db, "config", "local"));
    if (!snapshot.exists()) return;

    const config = snapshot.data();
    if (config.nombreNegocio) document.getElementById("config-nombre").value = config.nombreNegocio;
    if (config.colorPrimario) document.getElementById("config-color").value = config.colorPrimario;

    if (config.logoUrl) {
      const preview = document.getElementById("preview-logo");
      preview.src = config.logoUrl;
      preview.classList.remove("oculto");
    }
    if (config.heroImagenUrl) {
      const preview = document.getElementById("preview-hero");
      preview.src = config.heroImagenUrl;
      preview.classList.remove("oculto");
      document.getElementById("config-hero-sin-recortar").checked = config.heroAjuste === "contain";
    }
  } catch (error) {
    console.warn("No se pudo leer la configuración actual:", error);
  }
}

function conectarSelectorDeImagen(idInput, idPreview, guardarBlobEn, formatoForzado = null) {
  document.getElementById(idInput).addEventListener("change", async (evento) => {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    try {
      // Si no se fuerza un formato, se respeta el del archivo original:
      // PNG se mantiene PNG (conserva transparencia), cualquier otra cosa
      // se pasa a JPEG (pesa menos, ideal para fotos comunes).
      const formato = formatoForzado || (archivo.type === "image/png" ? "image/png" : "image/jpeg");
      const blob = await comprimirImagen(archivo, 1200, 0.8, formato);
      guardarBlobEn(blob);

      const preview = document.getElementById(idPreview);
      preview.src = URL.createObjectURL(blob);
      preview.classList.remove("oculto");
    } catch (error) {
      console.error(error);
      mostrarEstado("No se pudo procesar la imagen.", true);
    }
  });
}

async function guardarConfig(evento) {
  evento.preventDefault();

  const nombreNegocio = document.getElementById("config-nombre").value.trim();
  const colorPrimario = document.getElementById("config-color").value;

  try {
    mostrarEstado("Guardando...");

    const datosAGuardar = {
      nombreNegocio,
      colorPrimario,
      actualizadoEn: serverTimestamp()
    };

    if (logoNuevo) {
      datosAGuardar.logoUrl = await subirFotoACloudinary(logoNuevo);
    }
    if (heroNuevo) {
      datosAGuardar.heroImagenUrl = await subirFotoACloudinary(heroNuevo);
      datosAGuardar.heroAjuste = document.getElementById("config-hero-sin-recortar").checked
        ? "contain"
        : "cover";
    }

    // merge: true para no pisar campos que no se están editando ahora
    await setDoc(doc(db, "config", "local"), datosAGuardar, { merge: true });

    mostrarEstado("✅ Configuración guardada. Los cambios se ven al refrescar el catálogo.");
    logoNuevo = null;
    heroNuevo = null;
  } catch (error) {
    console.error(error);
    mostrarEstado("❌ No se pudo guardar. Probá de nuevo.", true);
  }
}

export function iniciarPanelConfig() {
  cargarConfigActual();

  conectarSelectorDeImagen("config-logo", "preview-logo", (blob) => (logoNuevo = blob), "image/png");
  conectarSelectorDeImagen("config-hero", "preview-hero", (blob) => (heroNuevo = blob)); // auto-detecta formato

  document.getElementById("form-config").addEventListener("submit", guardarConfig);
}
