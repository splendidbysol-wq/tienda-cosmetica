// splash.js
// Pantalla de bienvenida con el logo del local. Se muestra un momento y
// se desvanece sola, revelando el catálogo debajo. Espera a que tema.js
// termine de cargar el logo real (evento "tema-listo"), pero nunca se
// queda trabada: si algo falla o tarda de más, se cierra igual sola.

const TIEMPO_MINIMO_VISIBLE = 1500; // ms que se ve el logo como mínimo
const TIEMPO_MAXIMO_ESPERA = 3000; // por si tema.js tarda o falla, no bloqueamos más que esto

let yaSeOculto = false;

function ocultarSplash() {
  if (yaSeOculto) return;
  yaSeOculto = true;

  const splash = document.getElementById("splash");
  splash.classList.add("splash-oculto");

  // Recién después de que termine la transición lo sacamos del todo,
  // para no dejar un elemento invisible pero interceptando clicks.
  setTimeout(() => {
    splash.style.display = "none";
  }, 650);
}

document.addEventListener("DOMContentLoaded", () => {
  const inicio = Date.now();

  const cerrarRespetandoMinimo = () => {
    const transcurrido = Date.now() - inicio;
    const faltante = Math.max(0, TIEMPO_MINIMO_VISIBLE - transcurrido);
    setTimeout(ocultarSplash, faltante);
  };

  window.addEventListener("tema-listo", cerrarRespetandoMinimo, { once: true });

  // Red de seguridad: si "tema-listo" nunca llega, no dejamos al cliente
  // mirando el logo para siempre.
  setTimeout(ocultarSplash, TIEMPO_MAXIMO_ESPERA);
});
