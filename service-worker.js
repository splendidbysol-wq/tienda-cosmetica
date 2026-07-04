// service-worker.js
// Versión básica: cachea el shell de la app para que abra rápido
// y de forma más confiable en conexiones lentas. Se puede ampliar
// después para soporte offline más completo.

const CACHE_NAME = "tienda-cache-v1";
const ARCHIVOS_BASE = [
  "/index.html",
  "/manifest.json",
  "/css/estilos.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      return respuestaCache || fetch(event.request);
    })
  );
});
