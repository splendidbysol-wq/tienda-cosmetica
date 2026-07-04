// firebase-config.js
// Punto único de configuración de Firebase.
// Nota: ya no usamos Firebase Storage (las fotos van a Cloudinary, ver
// js/subida-fotos.js), porque Storage ahora exige el plan de pago Blaze
// incluso para uso mínimo. Firestore y Authentication no tienen esa exigencia.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Credenciales del proyecto mi-tienda-cosmetica-4d99d
const firebaseConfig = {
  apiKey: "AIzaSyBoVsxK-ZOqOVcG5krisN2K30-4nXwt6pc",
  authDomain: "mi-tienda-cosmetica-4d99d.firebaseapp.com",
  projectId: "mi-tienda-cosmetica-4d99d",
  storageBucket: "mi-tienda-cosmetica-4d99d.firebasestorage.app",
  messagingSenderId: "553410800464",
  appId: "1:553410800464:web:c2e206231000d780b49a55"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
