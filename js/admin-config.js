// admin-config.js
// Panel donde el vendedor cambia nombre, color de marca, logo y foto de
// fondo del catálogo — sin tocar Firestore ni código. Todo se guarda en
// el documento config/local, que tema.js lee del lado del catálogo.

import { db } from "./firebase-config.js";
import { comprimirImagen } from "./camara.js";
import { subirFotoACloudinary } from "./subida-fotos.js";
import { geocodificarDireccion } from "./geo.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
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
    if (config.aliasMercadoPago) document.getElementById("config-alias-mp").value = config.aliasMercadoPago;
    if (config.titularMercadoPago) document.getElementById("config-titular-mp").value = config.titularMercadoPago;
    if (config.cuilMercadoPago) document.getElementById("config-cuil-mp").value = config.cuilMercadoPago;
    if (config.whatsappComprobantes) document.getElementById("config-whatsapp-comprobantes").value = config.whatsappComprobantes;
    if (config.urlFuncionMercadoPago) document.getElementById("config-url-mp").value = config.urlFuncionMercadoPago;
    if (config.emailjsServiceId) document.getElementById("config-emailjs-service").value = config.emailjsServiceId;
    if (config.emailjsTemplateId) document.getElementById("config-emailjs-template").value = config.emailjsTemplateId;
    if (config.emailjsPublicKey) document.getElementById("config-emailjs-publickey").value = config.emailjsPublicKey;
    if (config.montoEnvioGratis != null) document.getElementById("config-monto-envio-gratis").value = config.montoEnvioGratis;
    if (config.direccionLocal) document.getElementById("config-direccion-local").value = config.direccionLocal;
    if (config.radioZonaCercanaKm != null) document.getElementById("config-radio-zona-km").value = config.radioZonaCercanaKm;
    if (config.costoEnvio != null) document.getElementById("config-costo-envio").value = config.costoEnvio;
    if (config.telefonoConsultaEnvio) document.getElementById("config-telefono-consulta-envio").value = config.telefonoConsultaEnvio;
    if (config.direccionRetiro) document.getElementById("config-direccion-retiro").value = config.direccionRetiro;
    if (config.horarioRetiro) document.getElementById("config-horario-retiro").value = config.horarioRetiro;

    if (config.logoUrl) {
      const preview = document.getElementById("preview-logo");
      preview.src = config.logoUrl;
      preview.classList.remove("oculto");
      document.getElementById("boton-quitar-logo").classList.remove("oculto");
    }
    if (config.heroImagenUrl) {
      const preview = document.getElementById("preview-hero");
      preview.src = config.heroImagenUrl;
      preview.classList.remove("oculto");
      document.getElementById("config-hero-sin-recortar").checked = config.heroAjuste === "contain";
      document.getElementById("boton-quitar-hero").classList.remove("oculto");
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

      const idBotonQuitar = idInput === "config-logo" ? "boton-quitar-logo" : "boton-quitar-hero";
      document.getElementById(idBotonQuitar).classList.remove("oculto");
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
  const aliasMercadoPago = document.getElementById("config-alias-mp").value.trim();
  const titularMercadoPago = document.getElementById("config-titular-mp").value.trim();
  const cuilMercadoPago = document.getElementById("config-cuil-mp").value.trim();
  const whatsappComprobantes = document.getElementById("config-whatsapp-comprobantes").value.trim();
  const urlFuncionMercadoPago = document.getElementById("config-url-mp").value.trim();
  const emailjsServiceId = document.getElementById("config-emailjs-service").value.trim();
  const emailjsTemplateId = document.getElementById("config-emailjs-template").value.trim();
  const emailjsPublicKey = document.getElementById("config-emailjs-publickey").value.trim();
  const montoEnvioGratisRaw = document.getElementById("config-monto-envio-gratis").value;
  const direccionLocal = document.getElementById("config-direccion-local").value.trim();
  const radioZonaCercanaKmRaw = document.getElementById("config-radio-zona-km").value;
  const costoEnvioRaw = document.getElementById("config-costo-envio").value;
  const telefonoConsultaEnvio = document.getElementById("config-telefono-consulta-envio").value.trim();
  const direccionRetiro = document.getElementById("config-direccion-retiro").value.trim();
  const horarioRetiro = document.getElementById("config-horario-retiro").value.trim();

  try {
    mostrarEstado("Guardando...");

    const datosAGuardar = {
      nombreNegocio,
      colorPrimario,
      aliasMercadoPago,
      titularMercadoPago,
      cuilMercadoPago,
      whatsappComprobantes,
      urlFuncionMercadoPago,
      emailjsServiceId,
      emailjsTemplateId,
      emailjsPublicKey,
      montoEnvioGratis: montoEnvioGratisRaw === "" ? null : Number(montoEnvioGratisRaw),
      costoEnvio: costoEnvioRaw === "" ? 0 : Number(costoEnvioRaw),
      radioZonaCercanaKm: radioZonaCercanaKmRaw === "" ? null : Number(radioZonaCercanaKmRaw),
      direccionLocal,
      telefonoConsultaEnvio,
      direccionRetiro,
      horarioRetiro,
      actualizadoEn: serverTimestamp()
    };

    // Si cargó (o cambió) la dirección del local, la convertimos a
    // coordenadas ahora — así en el checkout no hay que hacerlo de nuevo
    // cada vez, solo se geocodifica la dirección de cada cliente.
    let huboAdvertencia = false;

    if (direccionLocal) {
      mostrarEstado("Ubicando la dirección del local...");
      const coords = await geocodificarDireccion(direccionLocal);
      if (coords) {
        datosAGuardar.latLocal = coords.lat;
        datosAGuardar.lngLocal = coords.lng;
      } else {
        huboAdvertencia = true;
      }
    }

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

    if (huboAdvertencia) {
      mostrarEstado(
        "⚠️ Se guardó todo, pero no pudimos ubicar la dirección del local. Probá con calle, número, ciudad y provincia completos para que el cálculo de envío funcione.",
        true
      );
    } else {
      mostrarEstado("✅ Configuración guardada. Los cambios se ven al refrescar el catálogo.");
    }
    logoNuevo = null;
    heroNuevo = null;
  } catch (error) {
    console.error(error);
    mostrarEstado("❌ No se pudo guardar. Probá de nuevo.", true);
  }
}

async function quitarImagen(campoUrl, campoExtra, idPreview, idBotonQuitar, mensajeExito) {
  const confirmar = window.confirm("¿Seguro que querés quitar esta imagen? El catálogo va a volver al diseño por defecto en esa parte.");
  if (!confirmar) return;

  try {
    mostrarEstado("Quitando imagen...");

    const camposABorrar = { [campoUrl]: deleteField() };
    if (campoExtra) camposABorrar[campoExtra] = deleteField();

    await updateDoc(doc(db, "config", "local"), camposABorrar);

    document.getElementById(idPreview).classList.add("oculto");
    document.getElementById(idPreview).src = "";
    document.getElementById(idBotonQuitar).classList.add("oculto");

    if (campoUrl === "logoUrl") logoNuevo = null;
    if (campoUrl === "heroImagenUrl") heroNuevo = null;

    mostrarEstado(mensajeExito);
  } catch (error) {
    console.error(error);
    mostrarEstado("❌ No se pudo quitar la imagen. Probá de nuevo.", true);
  }
}

export function iniciarPanelConfig() {
  cargarConfigActual();

  conectarSelectorDeImagen("config-logo", "preview-logo", (blob) => (logoNuevo = blob), "image/png");
  conectarSelectorDeImagen("config-hero", "preview-hero", (blob) => (heroNuevo = blob)); // auto-detecta formato

  document.getElementById("form-config").addEventListener("submit", guardarConfig);

  document.getElementById("boton-quitar-logo").addEventListener("click", () =>
    quitarImagen("logoUrl", null, "preview-logo", "boton-quitar-logo", "✅ Logo eliminado.")
  );

  document.getElementById("boton-quitar-hero").addEventListener("click", () =>
    quitarImagen("heroImagenUrl", "heroAjuste", "preview-hero", "boton-quitar-hero", "✅ Imagen de fondo eliminada.")
  );
}
