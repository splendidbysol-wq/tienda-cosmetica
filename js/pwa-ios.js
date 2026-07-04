// pwa-ios.js
// iOS/Safari no dispara el evento "beforeinstallprompt" como Android/Chrome,
// así que detectamos manualmente si es iOS y no está instalada todavía,
// y mostramos instrucciones para "Agregar a pantalla de inicio".

function esIOS() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function yaEstaInstalada() {
  // En iOS, cuando la PWA corre instalada, navigator.standalone es true
  return window.navigator.standalone === true;
}

document.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("banner-instalar-ios");
  const botonCerrar = document.getElementById("cerrar-banner-ios");

  if (esIOS() && !yaEstaInstalada()) {
    const yaLoVio = localStorage.getItem("banner-ios-cerrado");
    if (!yaLoVio) {
      banner.classList.remove("oculto");
    }
  }

  botonCerrar.addEventListener("click", () => {
    banner.classList.add("oculto");
    localStorage.setItem("banner-ios-cerrado", "true");
  });
});
