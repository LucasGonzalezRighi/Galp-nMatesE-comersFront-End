# @galpon/admin

Dashboard de Galpón Mates: una SPA de Vite con React 19, TanStack Router (rutas por archivos), TanStack Query y TanStack Table. Con él, el dueño atiende los pedidos, carga productos con fotos, ordena las líneas, edita los textos del sitio y los ajustes, modera reseñas y lee los mensajes. Funciona sin backend (modo de prueba) y pasa a la API real cambiando variables de entorno.

## Scripts

Desde `frontend/` (con `-w @galpon/admin`) o dentro de `apps/admin`:

| Script              | Qué hace                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo en <http://localhost:5173> (puerto fijo; si está ocupado, falla). Sin CSP.  |
| `npm run build`     | Compila a `dist/`.                                                                                 |
| `npm run preview`   | Sirve `dist/` en <http://localhost:5173> con la CSP del admin (así se prueba, también en los E2E). |
| `npm run typecheck` | `tsr generate && tsc --noEmit`: regenera `src/routeTree.gen.ts` y revisa los tipos.                |

Desde `frontend/`, `npm run dev` levanta la tienda (:3000) y el admin (:5173) juntos.

`src/routeTree.gen.ts` lo genera el plugin del router (en `dev` y `build`) o `tsr generate`. Está commiteado, y excluido de lint y prettier. No se edita a mano.

## Pantallas y rutas

Todas las rutas salvo `/login` cuelgan de `routes/_authenticated.tsx`: sin sesión llevan a `/login?redirect=`. Los filtros viven en la URL, salvo la búsqueda de pedidos (email o nombre: nada personal en la URL).

| Ruta                                                                                                                                   | Pantalla                                                                                                                                                                                                                                                                        | Feature      |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `/login`                                                                                                                               | Ingreso (`?redirect=` validado)                                                                                                                                                                                                                                                 | `auth`       |
| `/`                                                                                                                                    | Resumen: ventas de hoy y de 7 días, para despachar, reseñas pendientes, mensajes sin leer, alertas de pago y poco stock                                                                                                                                                         | `dashboard`  |
| `/productos`                                                                                                                           | Tabla con búsqueda, línea, estado (`?estado=`, también "Archivados"), "Solo sin stock", orden y páginas                                                                                                                                                                         | `products`   |
| `/productos/nuevo` · `/productos/$id`                                                                                                  | Datos, precio y stock, estado, fotos (hasta 8, reordenables, con texto alternativo), textos propios de las pestañas; cambio de slug con redirección; archivar y volver a publicar                                                                                               | `products`   |
| `/lineas`                                                                                                                              | Lista ordenable (arrastrar o "Subir"/"Bajar"), alta y edición en un diálogo con foto, borrar (no si tiene productos)                                                                                                                                                            | `categories` |
| `/combos`                                                                                                                              | Lista ordenable (arrastrar o "Subir"/"Bajar"), alta y edición en un diálogo con una lista por grupo (Mate, Bombilla, Yerba: 2 o 3 piezas), precio final con la suma y el ahorro en vivo, borrador o publicado; avisos "Sin ahorro", "Sin stock" y "Pieza no disponible"; borrar | `combos`     |
| `/pedidos`                                                                                                                             | Tabla con estado del pedido (también "Para despachar"), estado del pago y búsqueda por número, email o nombre                                                                                                                                                                   | `orders`     |
| `/pedidos/$numero`                                                                                                                     | Cliente, envío, productos, totales, pago (con el enlace a Mercado Pago), historial y las acciones que permite el estado                                                                                                                                                         | `orders`     |
| `/contenido/inicio` · `/contenido/nosotros` · `/contenido/preguntas` · `/contenido/pestanas` · `/contenido/pie` · `/contenido/legales` | Textos del sitio por campos fijos (`/contenido` lleva a Inicio)                                                                                                                                                                                                                 | `content`    |
| `/ajustes`                                                                                                                             | Kit, envíos, cuotas, precio sin impuestos, vendedor y atención al cliente, email de contacto y umbral de poco stock                                                                                                                                                             | `settings`   |
| `/resenas`                                                                                                                             | Pendientes, aprobadas y ocultas: aprobar, ocultar, destacar en el inicio                                                                                                                                                                                                        | `reviews`    |
| `/mensajes`                                                                                                                            | Contacto y arrepentimientos, "Solo sin leer"; abrir uno lo marca leído                                                                                                                                                                                                          | `messages`   |
| `/cuenta`                                                                                                                              | Cambiar la contraseña                                                                                                                                                                                                                                                           | `auth`       |

Desde 1024 px hay una barra lateral fija con los contadores (pedidos para despachar, reseñas pendientes, mensajes sin leer); debajo, una barra superior con "Menú", que la abre en un cajón. Al navegar, el foco va al `h1` y la pestaña dice "{título} · Galpón Admin". Cada feature tiene su `README.md`.

## Modo de prueba

Sin variables de entorno el dashboard arranca en **modo de prueba**: no necesita backend. Un `fetch` en memoria (`@galpon/api-client/mock`) responde como la API, sobre la base del diseño (6 líneas, 27 productos, contenidos y ajustes) más los datos de demostración del admin.

- **Credenciales**: `admin@galponmates.com.ar` / `galpon-demo-2026` (`VITE_MOCK_ADMIN_EMAIL` y `VITE_MOCK_ADMIN_PASSWORD` de `.env.example`).
- **Sesión de 8 horas**, como la real. Si vence con una pantalla abierta, aparece "Tu sesión venció" con el formulario de ingreso sin salir de la pantalla: lo escrito se conserva y se vuelve a guardar después. Al navegar sin sesión se va a `/login?redirect=`.
- **Persistencia**: los cambios y la sesión se guardan en `sessionStorage` (clave `galpon.admin.mock.v1`): sobreviven a las recargas y se pierden al cerrar la pestaña. Si el navegador no deja usar `sessionStorage` (navegación privada, políticas, cupo lleno), sigue en memoria y la barra avisa "Sin persistencia".
- **Demora**: cada pedido a la API tarda entre 150 y 400 ms (`VITE_MOCK_LATENCY_MS=0` para no esperar).
- **La tienda no ve estos cambios**: tienda y admin tienen bases simuladas separadas hasta que exista el back (ADR 0003). La barra lateral lo avisa siempre debajo de "Modo de prueba": "Lo que cambies acá no llega a la tienda: cada una tiene sus datos de prueba." (`APP_COPY.mockNotShared`). Un combo guardado acá aparece en la lista del admin al instante, pero no en la tienda: para verlo en la tienda de prueba hay que escribirlo contra su propia base (`POST /api/v1/admin/combos` de la tienda, ver su README). Lo mismo con los cueros y el stock de un producto: `POST /api/v1/__mock/products/{id}` de la tienda con `{ leathers, stock }`.

### Cueros por producto (Ruling AT-5)

En `/productos/nuevo` y `/productos/$id`, entre "Precio y stock" y "Estado", la sección **"Cueros"** (`ProductLeathersFields`) aparece solo si la línea elegida es de mates: cuatro casillas con su muestra de color (Negro, Marrón, Crudo y Borravino, en ese orden) dentro del grupo "Cueros que ofrece este mate". Los marcados son los que el cliente puede elegir en la ficha, el kit y los combos; sin ninguno, la tienda no muestra el selector. Un producto nuevo arranca sin cueros y los mates de fábrica con los cuatro. Si la línea no es de mates se manda `leathers: []` (`toAdminProductInput(values, group)`); mientras cargan las líneas vale el grupo del producto guardado, así guardar rápido no le borra los cueros a un mate. Un `422` en `leathers` (por ejemplo "Solo los mates llevan cuero") aparece debajo de las casillas. No hay virola: va en la descripción. La ayuda de "Destacado" dice "Aparece en «Los más vendidos» del inicio.".

En el detalle de un pedido, una línea suelta muestra su `detail` tal cual (los pedidos anteriores conservan la virola: `GLP-09001` dice "Cuero negro · Alpaca cincelada") y un kit o un combo muestra sus piezas y, si tiene cuero, "Cuero Negro".

### Legales, datos del vendedor y el aviso (ronda legal)

- **`/contenido/legales`** tiene cuatro pestañas: Términos y condiciones, Política de privacidad, Política de cookies y Cambios y devoluciones (`?doc=terminos|privacidad|cookies|devoluciones`). Debajo del texto, "Cómo escribir el texto" (el formato de LA-1) y "Datos del vendedor" con los 8 marcadores, su código (`{{cuit}}`) y el valor guardado hoy o "Falta cargarlo en Ajustes". Un marcador que no existe (`{{cuitt}}`) da el error bajo "Texto" y no se guarda.
- **`/ajustes`**: "Vendedor y atención al cliente" con la condición frente al IVA, el domicilio legal, el teléfono opcional y "Data Fiscal (ARCA)", que acepta el código entero que entrega ARCA y guarda solo el enlace; la sección "Defensa del consumidor" con los dos enlaces obligatorios (vienen con los de fábrica).
- **Aviso "Faltan datos legales del vendedor"** (`MissingLegalDataNotice`): en Ajustes y arriba del Resumen (con "Completar en Ajustes"), nombra los 7 datos legales que faltan (`missingSellerFields`; el teléfono no cuenta) y desaparece cuando están todos.
- **Accesibilidad** (LS-8, WCAG 2.2): el botón que carga usa `aria-disabled` (no `disabled`: conserva el foco y no repite el envío), `scroll-padding` contra el encabezado del celular y la barra de Guardar, foco visible en el panel de pestañas, bordes de campo `neutral-600`, el visor de avisos no se come los clics y `e2e/support/axe.ts` mide WCAG 2.0, 2.1 y 2.2 A y AA.

### Datos de demostración

Se siembran al abrir el admin con una base nueva (`demo: 'admin'`; la tienda no los tiene). Las fechas son relativas al momento de abrirlo.

| Pedido      | Cliente          | Pedido / pago                 | Envío     | Para probar                                                                                                        |
| ----------- | ---------------- | ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `GLP-09001` | Lucía Pérez      | Pagado / Aprobado             | Domicilio | Pasar a preparación, despachar y entregar                                                                          |
| `GLP-09002` | Martín Gómez     | Pagado / Aprobado             | Retiro    | Alerta de pago duplicado en el Resumen                                                                             |
| `GLP-09003` | Carla Fernández  | En preparación / Aprobado     | Sucursal  | Despachar                                                                                                          |
| `GLP-09004` | Julián Rodríguez | Despachado / Aprobado         | Domicilio | Marcar como entregado                                                                                              |
| `GLP-09005` | Sofía Martínez   | Entregado / Aprobado          | Domicilio | Sin acciones                                                                                                       |
| `GLP-09006` | Tomás López      | Pendiente de pago / Sin pago  | Domicilio | Cancelar (libera la reserva)                                                                                       |
| `GLP-09007` | Valentina Díaz   | Pendiente de pago / Pendiente | Sucursal  | No se puede cancelar: "Hay un pago en curso". Como todo pendiente, vence unos 21 minutos después de abrir el admin |
| `GLP-09008` | Nicolás Romero   | Vencido / Sin pago            | Domicilio | Sin acciones                                                                                                       |
| `GLP-09009` | Camila Sosa      | Cancelado / Sin pago          | Retiro    | Sin acciones                                                                                                       |
| `GLP-09010` | Federico Álvarez | Devuelto / Devuelto           | Domicilio | Sin acciones (las devoluciones se hacen desde Mercado Pago)                                                        |
| `GLP-09011` | Agustina Torres  | Entregado / Contracargo       | Domicilio | Alerta de contracargo                                                                                              |
| `GLP-09012` | Matías Ruiz      | Despachado / En mediación     | Sucursal  | Alerta de mediación                                                                                                |

Además: **8 mensajes** (3 sin leer; 3 son arrepentimientos con código `ARR-00000x`) y **5 reseñas a moderar** (4 pendientes y 1 oculta), así que el menú arranca con "Pedidos, 3 para despachar", "Reseñas, 4 pendientes" y "Mensajes, 3 sin leer". En el Resumen, "Poco stock" muestra el Mate Galleta (sin stock) y el Mate Coquito Criollo (quedan 2).

### Fotos simuladas

En modo de prueba la subida no sale a la red, pero hace el mismo recorrido: valida la foto (JPG, PNG o WebP, hasta 10 MB, al menos 800 px del lado menor; 8 por producto, 1 por línea y 1 por socio), pide la firma a la API simulada, muestra el progreso con una vista previa `blob:` y guarda una versión reducida como data URL (lado mayor 640 px, WebP), registrada con `POST /__mock/media`. Así la foto sigue ahí después de recargar. Sirve cualquier JPG, PNG o WebP que cumpla esas reglas. En `public/mock-images/` están las fotos del catálogo de prueba (la misma copia que la tienda, porque el admin las sirve desde su propio origen), pero solo `mate-imperial-premium.jpg` llega a los 800 px: las del cliente son más chicas y se rechazan.

- Un archivo cuyo nombre empieza con **`error-`** (por ejemplo `error-mate.jpg`) falla en el primer intento: "Reintentar" lo sube bien.
- Una foto chica se rechaza antes de subir, con las medidas: "punto.png: La foto tiene que medir al menos 800 px del lado menor (esta mide 1 × 1 px)."
- El producto no se guarda mientras haya subidas en curso o en error.

Detalle en `src/components/media/README.md` y en el ADR 0005.

## Variables de entorno

Se validan al arrancar (`src/lib/env.ts`); si alguna no sirve, la pantalla muestra el motivo en español. Ver `.env.example`; para cambiarlas, copiarlo a `.env.local`.

| Variable                                            | Para qué                                                                                                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_MODE`                                     | `mock` (por defecto) o `live`.                                                                                                                                                    |
| `VITE_API_BASE_URL`                                 | Origen de la API (por ejemplo `https://api.galponmates.com.ar`): sin ruta, búsqueda ni credenciales, ni `/api/v1`. Obligatoria con `live`; se llama con `credentials: 'include'`. |
| `VITE_STORE_URL`                                    | Enlace a la tienda (por defecto `http://localhost:3000`): "Ver tienda", reseñas y productos.                                                                                      |
| `VITE_MOCK_ADMIN_EMAIL`, `VITE_MOCK_ADMIN_PASSWORD` | Cuenta de prueba (solo `mock`).                                                                                                                                                   |
| `VITE_MOCK_LATENCY_MS`                              | Demora simulada: `200`, `0` o un rango `150-400` (solo `mock`).                                                                                                                   |

## Modo vivo

Pasar a la API real es cambiar las variables (`VITE_API_MODE=live` y `VITE_API_BASE_URL`) y volver a compilar; no hay cambios de código.

- **Sesión**: cookie `httpOnly` del back y token CSRF en `X-CSRF-Token` en cada escritura. Si otro ingreso rotó el token, la escritura responde `403 csrf_invalid`: el admin vuelve a pedir el token y avisa "Actualizamos tu sesión. Probá de nuevo." (no reintenta solo).
- **Fotos en Cloudinary, con subida firmada** (ADR 0005): el admin valida la foto, pide la firma a `POST /admin/media/signature` (el secreto no sale del back) y sube directo a `https://api.cloudinary.com/v1_1/{cloudName}/image/upload` con `XMLHttpRequest` (progreso, cancelar y reintentar con una firma nueva). Guarda `{ publicId, width, height, alt }` y el back arma la `url`. Las imágenes se ven desde `https://res.cloudinary.com`.
- **Combos en la tienda al instante**: guardar, borrar u ordenar un combo invalida la lista del admin; con el back, cada escritura de combos le avisa a la tienda la etiqueta `combos` (y `products` cuando cambia el precio o el stock de una pieza) por `POST /api/revalidate`. Eso todavía falta en el back: ver "Combos" en `docs/api/README.md`.
- **Ediciones concurrentes**: al guardar un producto se manda `expectedUpdatedAt`; si otra pestaña lo cambió, el back responde `409 product_changed` y el admin ofrece "Ver la versión guardada" (descarta lo escrito) o "Guardar mis cambios igual"; Escape cierra y conserva lo escrito. En líneas, contenido y ajustes gana el último guardado.

### Seguridad: CSP y cabeceras

La SPA no tiene scripts inline, así que la política es estricta (`src/lib/csp.ts`, sección 16 del spec):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://res.cloudinary.com;
connect-src 'self' <origen de VITE_API_BASE_URL> https://api.cloudinary.com;
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- `vite preview` la manda sola (`vite.config.ts`, leyendo `VITE_API_BASE_URL` con `loadEnv`), junto con `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` (`ADMIN_SECURITY_HEADERS` en `src/lib/csp.ts`). `vite dev` no, porque Vite inyecta scripts inline para el HMR.
- **El servidor que sirva `dist/` en producción tiene que mandar las mismas cabeceras**, más `Strict-Transport-Security` (no va en `vite preview` porque sirve `http://localhost`), y servir `index.html` para cualquier ruta (es una SPA).
- `buildAdminCsp(apiOrigin)` arma la CSP: se le puede pasar el origen (o una URL con ruta) de la API. `img-src data:` es para las fotos del modo de prueba y `blob:` para la vista previa de una subida; la subida en vivo va a `api.cloudinary.com` (ver `src/components/media/README.md`).

## Estructura

```
src/
  main.tsx              arranque: entorno, API, router y proveedores
  app/                  estructura: AdminLayout (barra lateral, barra superior y cajón), menú y contadores,
                        query-client.ts (401 → "Tu sesión venció", 403 csrf_invalid), foco al h1 al navegar
  routes/               rutas por archivos de TanStack Router, finas: validateSearch (Zod con .catch),
                        contexto del router y la pantalla de la feature
    __root.tsx          contexto del router (RouterContext), 404 y error
    login.tsx           /login
    _authenticated.tsx  protege lo que cuelga de él y monta el uploader de fotos
    _authenticated/     una ruta por pantalla (tabla de arriba)
  features/             auth, dashboard, products, categories, orders, content, settings, reviews, messages:
                        cada una se cierra por su index.ts, no importa a otra y tiene su README
  components/ui/        kit de interfaz: Button, Field, TextInput, Select, DataTable, Dialog, ConfirmDialog,
                        ActionsMenu, Tabs, FormActions, UnsavedChangesGuard, SortableList, Skeleton,
                        EmptyState, ErrorState, toasts y las piezas de fotos (ImageDropzone, ImageTile,
                        SingleImageField). Ver su README
  components/media/     subida de fotos: validar, firmar, subir (XHR o simulada), cola y reintento
  lib/                  env.ts, api.ts (createAdminApi: API real o simulada con la demo), csp.ts, redirect.ts
  test/                 setup.ts (polyfills de jsdom y cleanup) y render.tsx (createTestApp, renderWithApp)
```

Las features no se importan entre sí: se comunican por rutas (`Link` tipado y parámetros de búsqueda) y por la API (claves de consulta `['admin', …]`). Las consultas usan las fábricas de `@galpon/api-client/react` y las escrituras los servicios de `@galpon/api-client` dentro de `useMutation`; las reglas de negocio vienen de `@galpon/domain` y las validaciones de `@galpon/schemas`. Toda ruta nueva que necesite sesión va dentro de `routes/_authenticated/`.

## Tests

### Tests de pantallas (Vitest)

`npm test -- --project admin` desde `frontend/` (jsdom, Testing Library y `user-event`), contra la API simulada real, sin mocks de `fetch` (la única excepción es el `XMLHttpRequest` de Cloudinary).

`createTestApp({ loggedIn, demo, now })` (`src/test/render.tsx`) arma la API simulada sin latencia, con la sesión iniciada y los datos de demostración, y devuelve `{ api, mockDb, queryClient, context, session }`. `renderWithApp(ui, { app, path, routePath })` dibuja la pantalla dentro de los proveedores y de un router en memoria que la muestra en `path`; cualquier otra dirección muestra "Ruta de prueba: {pathname}", así se afirma adónde navegó un `Link`. El reloj de la API es fijo (`TEST_NOW`) salvo que el test pase otro. Para ver avisos, el test monta `<Toaster />` junto a la pantalla.

### E2E (Playwright)

Proyecto `admin-desktop` de `playwright.config.ts`, contra el admin compilado y servido con `vite preview` (con la CSP; el fixture `cspGuard` hace fallar la prueba ante cualquier violación). Cada prueba abre un contexto nuevo, o sea una base de demostración nueva.

`playwright.config.ts` levanta los dos servidores aunque se pida un solo proyecto (la tienda con `npm run start -w @galpon/store` y el admin con `npm run preview -w @galpon/admin`), así que hace falta compilar los dos (o tener la tienda ya levantada en el puerto 3000):

```bash
npm run build
npx playwright test --project=admin-desktop
```

| Archivo (`e2e/admin/`)                                   | Qué prueba                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.spec.ts`                                           | Ingreso, contraseña incorrecta, contadores, recarga y cerrar sesión                                                                                                                                                                                                                                                                                      |
| `session.spec.ts`                                        | La sesión vence mientras se edita un producto (`page.clock`): re-ingreso sin salir y lo editado se guarda                                                                                                                                                                                                                                                |
| `products.spec.ts`                                       | Producto nuevo con dos fotos (una con `error-` y "Reintentar"), una de 1 × 1 rechazada, "Mover antes" y texto alternativo; cambio de slug con aviso; archivar y volver a publicar                                                                                                                                                                        |
| `categories.spec.ts`                                     | Línea nueva y "Subir"; no se borra "Imperiales"                                                                                                                                                                                                                                                                                                          |
| `orders.spec.ts`                                         | `GLP-09001` de pagado a entregado; cancelar `GLP-09006`; `GLP-09007` con pago en curso; "Ver pedidos" del Resumen; búsqueda por email fuera de la URL                                                                                                                                                                                                    |
| `reviews.spec.ts`, `messages.spec.ts`                    | Aprobar y destacar (contador de 4 a 3); "Solo sin leer" y abrir uno (contador de 3 a 2)                                                                                                                                                                                                                                                                  |
| `content.spec.ts`, `settings.spec.ts`, `account.spec.ts` | Pregunta nueva que sobrevive a la recarga y "¿Salir sin guardar?"; CUIT inválido e IVA "10,5"; el aviso de datos legales que desaparece al cargar los 7; cambio de contraseña                                                                                                                                                                            |
| `a11y.spec.ts`                                           | axe (sin violaciones serias ni críticas) en el ingreso, en cada pantalla con sesión, en el 404 y con los diálogos de una línea, de despacho y de sesión vencida; teclado en los diálogos y el foco al título después de archivar; con WCAG 2.2: foco visible en el panel de pestañas, el Resumen a 320 px sin desborde y el foco no tapado en el celular |
| `mobile.spec.ts`                                         | A 390 × 844: "Menú" abre el cajón y navega; ninguna pantalla con scroll horizontal                                                                                                                                                                                                                                                                       |
| `visual.spec.ts`                                         | Capturas `test-results/visual/admin-{pantalla}-{1440\|390}.png` para la lista de control                                                                                                                                                                                                                                                                 |

`products.spec.ts` suma los cueros (Ruling AT-5): en el Mate Imperial Premium se desmarcan Crudo y Borravino, se guarda y al recargar quedan Negro y Marrón; la Yerba Canarias 1 kg no muestra la sección "Cueros".

La lista de control visual está en [`docs/design/admin/CHECKLIST-P4.md`](../../docs/design/admin/CHECKLIST-P4.md), con sus desvíos: los que quedan abiertos (6 y 7) son para P5. Ninguna prueba está marcada con `test.fail` ni excluye reglas de axe.
