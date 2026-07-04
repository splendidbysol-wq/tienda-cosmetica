// subida-fotos.js
// Sube la foto comprimida a Cloudinary usando un "unsigned upload preset"
// (no requiere clave secreta ni backend, apto para llamar desde el navegador).
//
// IMPORTANTE sobre borrado: con un preset "unsigned" no es posible borrar
// fotos de forma segura desde el navegador (borrar requiere una clave secreta
// que no puede viajar en el código del cliente). Por eso, cuando se edita o
// borra un producto, la foto vieja queda "huérfana" en Cloudinary — no se
// borra sola. Esto no genera costo mientras se esté dentro del plan gratis;
// simplemente conviene entrar cada tanto al panel de Cloudinary
// (Media Library) y borrar a mano las que ya no se usan.

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./cloudinary-config.js";

const URL_SUBIDA = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Sube un blob de imagen (ya comprimido por camara.js) a Cloudinary.
 * @param {Blob} blob - imagen comprimida (JPEG o PNG)
 * @returns {Promise<string>} URL pública y definitiva de la imagen
 */
export async function subirFotoACloudinary(blob) {
  // Detectamos la extensión según el tipo real del blob, para no forzar
  // .jpg en archivos PNG (que perderían la transparencia si Cloudinary
  // los reinterpretara mal).
  const extension = blob.type === "image/png" ? "png" : "jpg";

  const formData = new FormData();
  formData.append("file", blob, `producto.${extension}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "productos");

  const respuesta = await fetch(URL_SUBIDA, {
    method: "POST",
    body: formData
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    console.error("Error de Cloudinary:", detalle);
    throw new Error("No se pudo subir la foto. Probá de nuevo.");
  }

  const datos = await respuesta.json();
  return datos.secure_url; // URL https lista para guardar en Firestore
}
