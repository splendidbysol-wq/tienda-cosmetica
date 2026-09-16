// admin-ventas.js
// Resumen rápido de cuánto se vendió hoy, esta semana y este mes.
// Solo cuenta pedidos que no fueron cancelados (un pedido cancelado
// nunca se concretó, no es una venta real).

import { db } from "./firebase-config.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function inicioDeHoy() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

function inicioDeSemana() {
  const fecha = inicioDeHoy();
  const diaSemana = fecha.getDay(); // 0 = domingo
  const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  fecha.setDate(fecha.getDate() - diasDesdeLunes);
  return fecha;
}

function inicioDeMes() {
  const fecha = new Date();
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function calcularResumen(pedidos) {
  const desdeHoy = inicioDeHoy();
  const desdeSemana = inicioDeSemana();
  const desdeMes = inicioDeMes();

  const resumen = {
    hoy: { total: 0, cantidad: 0 },
    semana: { total: 0, cantidad: 0 },
    mes: { total: 0, cantidad: 0 }
  };

  pedidos.forEach((p) => {
    const fecha = p.creadoEn?.toDate ? p.creadoEn.toDate() : null;
    if (!fecha) return;

    if (fecha >= desdeMes) {
      resumen.mes.total += p.total || 0;
      resumen.mes.cantidad += 1;
    }
    if (fecha >= desdeSemana) {
      resumen.semana.total += p.total || 0;
      resumen.semana.cantidad += 1;
    }
    if (fecha >= desdeHoy) {
      resumen.hoy.total += p.total || 0;
      resumen.hoy.cantidad += 1;
    }
  });

  return resumen;
}

function renderResumen(resumen) {
  const contenedor = document.getElementById("resumen-ventas");

  contenedor.innerHTML = `
    <ul class="lista-informe">
      <li><span>Hoy</span><strong>$${resumen.hoy.total} (${resumen.hoy.cantidad} pedido${resumen.hoy.cantidad === 1 ? "" : "s"})</strong></li>
      <li><span>Esta semana</span><strong>$${resumen.semana.total} (${resumen.semana.cantidad} pedido${resumen.semana.cantidad === 1 ? "" : "s"})</strong></li>
      <li><span>Este mes</span><strong>$${resumen.mes.total} (${resumen.mes.cantidad} pedido${resumen.mes.cantidad === 1 ? "" : "s"})</strong></li>
    </ul>
  `;
}

export function iniciarResumenVentas() {
  const pedidosRef = collection(db, "pedidos");
  const q = query(pedidosRef, where("estado", "!=", "cancelado"));

  onSnapshot(
    q,
    (snapshot) => {
      const pedidos = snapshot.docs.map((d) => d.data());
      renderResumen(calcularResumen(pedidos));
    },
    (error) => {
      console.error("Error cargando resumen de ventas:", error);
      document.getElementById("resumen-ventas").innerHTML = "<p>No se pudo cargar el resumen de ventas.</p>";
    }
  );
}
