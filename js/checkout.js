// checkout.js
// Confirmación del pedido: valida stock, lo descuenta de forma segura
// (transacción, para evitar que se vendan dos veces las últimas unidades)
// y crea el documento del pedido en Firestore.

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { obtenerCarrito, calcularTotal, vaciarCarrito } from "./carrito.js";

/**
 * Intenta confirmar el pedido:
 * 1. Verifica en una transacción que haya stock suficiente de cada producto
 * 2. Descuenta el stock
 * 3. Crea el documento en la colección `pedidos`
 *
 * Si algún producto no tiene stock suficiente, no se descuenta nada
 * (la transacción se cancela entera) y se avisa cuál es el problema.
 */
export async function confirmarPedido(datosCliente, metodoPago) {
  const carrito = obtenerCarrito();

  if (carrito.length === 0) {
    throw new Error("El carrito está vacío.");
  }

  const total = calcularTotal(carrito);

  const idPedido = await runTransaction(db, async (transaction) => {
    // Paso 1: leer el stock actual de cada producto y validar
    const lecturas = [];
    for (const item of carrito) {
      const productoRef = doc(db, "productos", item.productoId);
      const snapshot = await transaction.get(productoRef);

      if (!snapshot.exists()) {
        throw new Error(`El producto "${item.nombre}" ya no existe.`);
      }

      const stockActual = snapshot.data().stock ?? 0;
      if (stockActual < item.cantidad) {
        throw new Error(
          `No hay stock suficiente de "${item.nombre}" (quedan ${stockActual}).`
        );
      }

      lecturas.push({ productoRef, stockActual, item });
    }

    // Paso 2: descontar el stock (recién acá, después de validar todo)
    for (const { productoRef, stockActual, item } of lecturas) {
      transaction.update(productoRef, {
        stock: stockActual - item.cantidad,
        actualizadoEn: serverTimestamp()
      });
    }

    // Paso 3: crear el pedido
    const pedidoRef = doc(collection(db, "pedidos"));
    transaction.set(pedidoRef, {
      cliente: datosCliente,
      productos: carrito.map((item) => ({
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precio
      })),
      total,
      estado: "pendiente",
      metodoPago,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp()
    });

    return pedidoRef.id;
  });

  vaciarCarrito();
  return idPedido;
}
