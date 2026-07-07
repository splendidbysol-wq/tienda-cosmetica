// geo.js
// Convierte una dirección de texto en coordenadas (geocodificación) usando
// Nominatim (OpenStreetMap), gratis y sin necesidad de clave ni tarjeta.
// Con las coordenadas de dos direcciones, calculamos la distancia en línea
// recta entre ellas — no es la distancia real que haría un cadete en moto,
// pero alcanza para decidir automáticamente si algo está "cerca" o "lejos",
// sin que el cliente pueda elegirlo a mano.

const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Convierte una dirección de texto en coordenadas {lat, lng}.
 * Devuelve null si no se pudo encontrar (dirección muy vaga, error de red, etc.)
 * — en ese caso, quien use esta función debería tratarlo como "no se pudo
 * verificar" y no asumir que está cerca.
 */
export async function geocodificarDireccion(direccion) {
  if (!direccion || direccion.trim().length < 5) return null;

  try {
    const url = `${URL_NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(direccion)}`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) return null;

    const datos = await respuesta.json();
    if (!datos || datos.length === 0) return null;

    return {
      lat: parseFloat(datos[0].lat),
      lng: parseFloat(datos[0].lon)
    };
  } catch (error) {
    console.warn("No se pudo geocodificar la dirección:", error);
    return null;
  }
}

/**
 * Distancia en línea recta (km) entre dos puntos, usando la fórmula de Haversine.
 */
export function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
