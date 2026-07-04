// tema.js
// Lee config/local en Firestore y aplica el color de marca del negocio
// sobre las variables CSS. Así, revender esta plantilla a otro local
// es cambiar dos campos en Firestore, no tocar código.

import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function aplicarTema() {
  try {
    const snapshot = await getDoc(doc(db, "config", "local"));
    if (!snapshot.exists()) return; // usa los valores por defecto del CSS

    const config = snapshot.data();
    const raiz = document.documentElement.style;

    if (config.colorPrimario) raiz.setProperty("--color-acento", config.colorPrimario);
    if (config.colorSecundario) raiz.setProperty("--color-acento-suave", config.colorSecundario);

    if (config.nombreNegocio) {
      const titulo = document.getElementById("nombre-negocio");
      if (titulo) titulo.textContent = config.nombreNegocio;
      document.title = config.nombreNegocio;
    }

    if (config.logoUrl) {
      const logo = document.getElementById("logo-negocio");
      if (logo) {
        logo.src = config.logoUrl;
        logo.classList.remove("oculto");
      }
    }

    if (config.heroImagenUrl) {
      const heroFondo = document.getElementById("hero-fondo");
      if (heroFondo) {
        const esCompleta = config.heroAjuste === "contain";
        // Capa doble: la imagen arriba, el degradado bordó de respaldo abajo.
        // Si el ajuste es "contain" (gráfico completo), el degradado se ve
        // asomando en los costados donde la imagen no llega a cubrir.
        heroFondo.style.backgroundImage = `url("${config.heroImagenUrl}"), linear-gradient(135deg, var(--color-acento), var(--color-tinta))`;
        heroFondo.style.backgroundSize = esCompleta ? "contain, cover" : "cover, cover";
        heroFondo.style.backgroundRepeat = "no-repeat, no-repeat";
        heroFondo.style.backgroundPosition = "center, center";
        heroFondo.classList.add("con-imagen");
      }
    }
  } catch (error) {
    console.warn("No se pudo cargar la configuración de marca, se usan valores por defecto:", error);
  }
}

aplicarTema();
