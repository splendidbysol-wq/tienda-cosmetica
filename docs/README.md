# Mi Tienda - Guía en criollo

Catálogo web instalable en el celu (funciona como una app, incluso en iPhone),
pensado para venderse como plantilla a distintos comercios (cosmética, ropa, etc.).

## Qué usa esto por debajo

- **Firebase Firestore**: guarda los productos y los pedidos. Gratis, sin tarjeta.
- **Firebase Authentication**: el login del vendedor. Gratis, sin tarjeta.
- **Cloudinary**: guarda las fotos de los productos. Gratis, sin tarjeta.
- (Ya **no** se usa Firebase Storage — pedía vincular una tarjeta incluso
  para uso mínimo, así que las fotos se movieron a Cloudinary, que tiene
  un plan gratis real sin ese requisito.)

## Puesta en marcha, paso a paso

### 1. Crear el proyecto en Firebase

1. Entrá a **console.firebase.google.com**
2. "Crear proyecto" → le ponés un nombre → Google Analytics lo podés dejar apagado
3. Adentro del proyecto, activá:
   - **Firestore Database** → "Crear base de datos" → modo producción → región `southamerica-east1`
   - **Authentication** → pestaña "Sign-in method" → activar "Correo electrónico/contraseña"

### 2. Conectar la app a Firebase

1. Ícono de **engranaje** → "Configuración del proyecto" → "Tus apps" → ícono `</>`
2. Le ponés un nombre → "Registrar app" → te va a mostrar un bloque con `apiKey`, `projectId`, etc.
3. Abrís `js/firebase-config.js` y reemplazás cada `TU_...` por esos valores. Guardás.

### 3. Subir las reglas de seguridad de Firestore

El archivo `firestore.rules` ya viene listo con las reglas correctas
(quién puede leer/escribir cada cosa). Solo hay que subirlo:

1. En Firebase Console → Firestore Database → pestaña "Reglas"
2. Pegás el contenido de `firestore.rules` y le das "Publicar"

### 4. Cloudinary (fotos)

Ya está conectado con tus credenciales (`js/cloudinary-config.js`). No tenés
que hacer nada más acá, salvo recordar: **de vez en cuando entrá a
cloudinary.com → Media Library y borrá fotos viejas** que ya no uses (cuando
editás o borrás un producto, la foto vieja no se borra sola — te lo explico
más abajo en detalle, no es grave, solo hay que acordarse).

### 5. Crear tu usuario para entrar al panel

1. Firebase Console → Authentication → pestaña "Users" → "Add user"
2. Ponés el email y contraseña con la que vas a entrar a `admin.html`

### 6. Agregar los íconos

En la carpeta `/icons/` faltan dos imágenes (192x192 y 512x512 px, PNG) para
que la app se vea bien instalada en el celular. Cualquier logo cuadrado sirve
para arrancar.

### 7. Publicar la app

Subís todo a GitHub Pages (como ya hiciste con tus otros proyectos) o a
Firebase Hosting. Una vez publicada, la abrís desde el celu y la "agregás a
pantalla de inicio" para que quede instalada.

## Cómo se usa el día a día

### El catálogo (`index.html`)
Lo que ve el cliente. Agrega productos al carrito, arma su pedido, lo confirma
con sus datos (nombre, teléfono, dirección si hay envío) y elige método de pago.

### El panel (`admin.html`)
Lo usás vos (o quien venda). Te logueás con el usuario que creaste en el
paso 5, y ahí:
- **Cargás un producto nuevo**: nombre, precio, stock, categoría, y sacás la
  foto con el botón de cámara (se comprime sola antes de subir, no hace falta
  que hagas nada).
- **Editás o borrás** productos ya cargados, en la lista de abajo del formulario.

### El carrito y el pedido
Cuando un cliente confirma un pedido, el sistema chequea que haya stock
disponible y lo descuenta automáticamente. Si dos personas quieren comprar
la última unidad al mismo tiempo, solo una lo consigue — nunca se vende de más.

**Importante sobre las fotos**: como el borrado automático de fotos requeriría
un servidor propio (algo para más adelante si hace falta), cuando editás la
foto de un producto o lo borrás del todo, la foto vieja queda dando vueltas
en Cloudinary sin usarse. No cuesta nada mientras estés dentro del plan
gratis, pero conviene entrar cada tanto a limpiar (Cloudinary → Media Library
→ seleccionar y borrar).

## Identidad visual

El diseño usa como idea la etiqueta de precio / ticket — algo que
comparten cosmética y ropa. Cada producto se ve como una tarjeta con la
esquina cortada y un "ojal", precio en una tipografía tipo sello, y el
nombre del local en una tipografía con más carácter.

**Para venderle esto a otro local**, no hace falta tocar el diseño ni el
código: alcanza con cargar dos datos en Firestore, en un documento llamado
`config/local`:
- `colorPrimario`: el color de marca del nuevo cliente (ej: `#2A5C45`)
- `nombreNegocio`: el nombre que va a aparecer arriba del catálogo

El script `js/tema.js` los lee solo y repinta la tienda. Si ese documento
no existe, usa los colores por defecto (ciruela).

## Qué está listo y qué falta

- [x] Catálogo + carga de productos con foto
- [x] Panel de administración con login
- [x] Edición y borrado de productos
- [x] Carrito de compras + confirmación de pedido con control de stock
- [x] Diseño propio, configurable por local
- [ ] Cobro automático con Mercado Pago (hoy el cliente elige el método,
      pero el pago se coordina aparte, no es automático todavía)
- [ ] Aviso automático al vendedor cuando entra un pedido nuevo

## Estructura de archivos (por si necesitás encontrar algo)

```
tienda-app/
├── index.html              # El catálogo (lo ve el cliente)
├── admin.html               # El panel (lo usás vos)
├── manifest.json           # Config para que se instale como app
├── service-worker.js       # Para que cargue rápido / funcione como PWA
├── firestore.rules         # Reglas de seguridad de la base de datos
├── js/
│   ├── firebase-config.js     # Conexión a Firebase (tus credenciales)
│   ├── cloudinary-config.js   # Conexión a Cloudinary (tus credenciales)
│   ├── subida-fotos.js        # Sube las fotos a Cloudinary
│   ├── auth.js                # Login/logout del vendedor
│   ├── camara.js              # Abre la cámara y comprime la foto
│   ├── admin-productos.js     # Alta, edición y borrado de productos
│   ├── productos.js           # Catálogo: lee y muestra los productos
│   ├── carrito.js             # Estado del carrito
│   ├── carrito-ui.js          # El "cajón" del carrito y el checkout
│   ├── checkout.js            # Confirma el pedido y descuenta stock
│   ├── tema.js                 # Aplica el color/nombre de cada local
│   └── pwa-ios.js              # Cartel de instalación para iPhone
├── css/
│   ├── estilos.css        # Diseño del catálogo
│   └── admin.css          # Diseño del panel
├── icons/                 # Íconos de la app (faltan las imágenes reales)
└── docs/
    ├── modelo-datos.md    # Cómo están organizados los datos en Firestore
    └── README.md          # Este archivo
```
