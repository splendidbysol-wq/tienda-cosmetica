// auth.js
// Login/logout del vendedor con Firebase Authentication (email/password).

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export function iniciarSesion(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function cerrarSesion() {
  return signOut(auth);
}

/**
 * Ejecuta un callback cada vez que cambia el estado de login.
 * Usar esto para mostrar/ocultar el panel de admin según si hay
 * un vendedor logueado o no.
 */
export function observarSesion(callback) {
  onAuthStateChanged(auth, (usuario) => {
    callback(usuario); // usuario es null si no está logueado
  });
}
