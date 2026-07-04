# Modelo de datos - Firestore

## Colección: `productos`

```
productos/{productoId}
├── nombre: string          // "Labial mate rojo"
├── descripcion: string     // opcional
├── precio: number          // en pesos, sin formato (ej: 4500)
├── categoria: string       // "cosmetica" | "ropa" | etc.
├── variantes: array        // ej: [{ talle: "M", stock: 5 }, { talle: "L", stock: 2 }]
│                           // si el producto no tiene variantes, usar stock directo:
├── stock: number           // stock general si no hay variantes
├── urlFoto: string         // URL de Firebase Storage
├── activo: boolean         // true = visible en catálogo, false = oculto
├── creadoEn: timestamp
└── actualizadoEn: timestamp
```

## Colección: `pedidos`

```
pedidos/{pedidoId}
├── cliente: {
│     nombre: string,
│     telefono: string,
│     direccion: string (opcional, si hay envío)
│   }
├── productos: array        // [{ productoId, nombre, cantidad, precioUnitario }]
├── total: number
├── estado: string          // "pendiente" | "confirmado" | "en_preparacion" | "enviado" | "entregado" | "cancelado"
├── metodoPago: string      // "mercadopago" | "efectivo" | "transferencia"
├── creadoEn: timestamp
└── actualizadoEn: timestamp
```

## Colección: `config`

```
config/local
├── nombreNegocio: string
├── colorPrimario: string   // hex, para identidad visual
├── colorSecundario: string
├── logoUrl: string
├── metodosPagoHabilitados: array   // ["mercadopago", "efectivo"]
└── whatsappContacto: string        // opcional, para notificar pedidos
```

## Decisiones de diseño pendientes

- **Cancelación de eventos/pedidos**: soft-delete (marcar `estado: "cancelado"`) vs
  hard-delete (borrar el documento). Recomendación: **soft-delete**, para mantener
  historial y estadísticas. Mismo criterio que se usó en el calendario de eventos.
- **Multi-tenant** (si se vende a varios locales): se puede resolver agregando un
  campo `negocioId` en cada documento, o separando por proyecto de Firebase distinto
  por cliente. Definir cuando haya un segundo cliente real.
