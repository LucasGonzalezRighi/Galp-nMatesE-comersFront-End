# @galpon/api-client

Cliente de la API de Galpón Mates (sección 13 del spec): los tipos del contrato, el cliente tipado, los errores, los servicios y los hooks de TanStack Query. El modo de prueba (`@galpon/api-client/mock`) responde la API en memoria, sin backend.

## Tipos del contrato

`src/generated/schema.d.ts` se genera desde [`docs/api/openapi.yaml`](../../docs/api/openapi.yaml) y no se edita a mano. Exporta `paths`, `components`, `operations` y un tipo por schema (`Category`, `ProductSummary`, `Order`, `AdminProduct`…).

```bash
npm run api:generate   # regenera schema.d.ts
npm run api:check      # falla si schema.d.ts no coincide con el contrato
```

Los dos corren `npx --yes openapi-typescript@7.13.0`. El paquete no es una dependencia: su peer pide TypeScript 5 y npm no admite ese conflicto con TypeScript 6. La primera vez necesita conexión para descargarlo.

Cuando cambia el contrato: editá el YAML, corré `npm run api:lint`, `npm run api:generate` y commiteá el `schema.d.ts` junto con el YAML.

## Alineación con `domain`

`src/contract-alignment.ts` solo tiene aserciones de tipos, sin código en tiempo de ejecución. Compara cada enum del contrato (`ProductGroup`, `ProductStatus`, `Leather`, `Ferrule`, `ProductSortOrder`, `ShippingMethod`, `OrderStatus`, `PaymentStatus`, `PaymentMethod`, `Province`) con el de `@galpon/domain`, y `ContactReason` con el de `@galpon/schemas`. Si un valor cambia de un lado y no del otro, `npm run typecheck` falla en la línea del enum desfasado.

## Cliente

```ts
import { createApiClient } from '@galpon/api-client'

const api = createApiClient({
  baseUrl: 'http://localhost:4000/api/v1', // absoluta, con el prefijo de versión
  credentials: 'include', // el admin, cuando la API está en otro origen
  getCsrfToken: () => session.csrfToken, // se lee en cada pedido
  getOrderToken: () => savedOrder?.orderToken, // la tienda, durante el checkout
})
```

`createApiClient` devuelve un cliente de [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) tipado con `paths`. Agrega `Accept: application/json` a todo pedido y, si `getCsrfToken` devuelve un token, `X-CSRF-Token` a los que no son `GET` ni `HEAD`. Si `getOrderToken` devuelve un token, lo manda en `X-Order-Token` solo a las rutas de un pedido (`/orders/{number}` y sus pagos), nunca a `/me/orders` ni al admin, y nunca en la URL. `baseUrl` tiene que ser absoluta (`http` o `https`): en Node una relativa falla, y con otra cosa `createApiClient` lanza `RangeError`. `fetch` es opcional (por omisión, el global) y los tests pasan uno falso que recibe el `Request`.

## Errores

Todo lo que falla llega como `ApiError`:

| Propiedad           | Qué es                                                                                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`              | `validation` (400, 422 y otros 4xx), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `rate_limited` (429), `server` (5xx) o `network` (no hubo respuesta: sin conexión, o un pedido cancelado o con el tiempo vencido) |
| `status`            | El estado HTTP, o `null` si no hubo respuesta                                                                                                                                                                                                        |
| `problem`           | El `application/problem+json` del servidor, o `null` si no lo trajo                                                                                                                                                                                  |
| `fieldErrors`       | El primer mensaje de cada campo, por ruta (`customer.email`); vacío si no hay detalle                                                                                                                                                                |
| `retryAfterSeconds` | Los segundos de `Retry-After`, o `null`                                                                                                                                                                                                              |
| `message`           | El `detail` (o `title`) del problema; si no hay, un texto en español según el `kind`                                                                                                                                                                 |

`isApiError(error)` es el type guard. `apiErrorFromResponse(response, body)` y `networkError(cause)` arman el error; `unwrap(call)` y `unwrapVoid(call)` desenvuelven una llamada de `openapi-fetch` (`api.GET(...)`) y devuelven los datos o lanzan el `ApiError`. Los servicios ya las usan.

## Servicios

Cada servicio recibe el `ApiClient` como primer argumento y devuelve los datos ya tipados o lanza `ApiError`. Los que reciben un slug, una página o un documento lanzan `RangeError` si el valor no sirve para armar la ruta; el formato del slug lo valida el servidor. Lo mismo pasa con `page` y `pageSize` de `listProducts`: el cliente los manda tal cual y el servidor responde `422` si no sirven.

| Archivo            | Servicios                                                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`          | `listCategories`, `listProducts(api, query?)`, `listAllProducts(api, query?)` (junta las páginas de 100), `getProduct`, `listRelatedProducts`                                                                                                                     |
| `reviews`          | `listProductReviews(api, slug, page?)`, `listFeaturedReviews`                                                                                                                                                                                                     |
| `content`          | `getHomeContent`, `getAboutContent`, `getFaqContent`, `getFooterContent`, `getProductTabsContent`, `getLegalContent(api, 'terms' \| 'privacy')`                                                                                                                   |
| `settings`         | `getPublicSettings`                                                                                                                                                                                                                                               |
| `admin-auth`       | `adminLogin`, `adminLogout`, `getAdminSession`, `getAdminCsrfToken`, `changeAdminPassword`                                                                                                                                                                        |
| `admin-products`   | `listAdminProducts(api, query?)`, `getAdminProduct`, `createAdminProduct`, `updateAdminProduct(api, id, input)` (con `expectedUpdatedAt`), `archiveAdminProduct`                                                                                                  |
| `admin-catalog`    | `listAdminCategories`, `createAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`, `reorderAdminCategories(api, ids)`, `createMediaSignature(api, purpose)`                                                                                              |
| `admin-orders`     | `getDashboardSummary`, `listAdminOrders(api, query?)`, `getAdminOrder(api, number)`, `changeOrderStatus(api, number, input)`                                                                                                                                      |
| `admin-content`    | `getAdmin{Home,About,Faq,Footer,ProductTabs}Content` y `updateAdmin…Content(api, input)` (Nosotros recibe `AboutContentInput`), `getAdminLegalContent(api, document)`, `updateAdminLegalContent(api, document, input)`, `getAdminSettings`, `updateAdminSettings` |
| `admin-moderation` | `listAdminReviews(api, query?)`, `updateAdminReview(api, id, input)`, `listAdminMessages(api, query?)`, `updateAdminMessage(api, id, input)`                                                                                                                      |
| `cart`             | `quoteCart`, `quoteShipping`                                                                                                                                                                                                                                      |
| `orders`           | `createOrder(api, input, idempotencyKey)`, `getOrder(api, number)`                                                                                                                                                                                                |
| `payments`         | `createMercadoPagoPreference(api, number, key)`, `payWithCard(api, number, input, key)`, `getInstallments`, `cancelPayment`                                                                                                                                       |
| `account`          | `getCustomerCsrfToken`, `register`, `login`, `logout`, `forgotPassword`, `resetPassword`, `getMe`, `updateMe`, `listMyOrders(api, page?)`, `getMyOrder`, `listMyAddresses`, `createMyAddress`, `updateMyAddress`, `deleteMyAddress`                               |

Los que reciben un número de pedido, una `Idempotency-Key` o el id de una dirección lanzan `RangeError` si no tienen formato (`GLP-` y cinco dígitos, un UUID, letras/números/guiones). La `Idempotency-Key` la genera la tienda una vez por intento y la reutiliza en los reintentos de red: con la misma clave el back devuelve el mismo pedido o el mismo resultado de pago.

`ProductQuery`, `AdminProductQuery`, `AdminOrderQuery`, `AdminReviewQuery` y `AdminMessageQuery` son los parámetros de búsqueda de `GET /products`, `/admin/products`, `/admin/orders`, `/admin/reviews` y `/admin/messages` según el contrato (`AdminOrderQuery.status` es una lista: `['paid', 'preparing']` son los pedidos para despachar). También se exportan `AdminContentPage` (`home`, `about`, `faq`, `footer` o `product-tabs`), `LegalDocument`, `MediaPurpose` y los tipos del contrato, como `AboutContentInput`. Los servicios del admin que reciben un número de pedido o el id de una reseña o un mensaje lanzan `RangeError` si no sirve para armar la ruta; los de contenido legal, si el documento no es `terms` ni `privacy`.

## Hooks de React

`@galpon/api-client/react` necesita `react` y `@tanstack/react-query` (son `peerDependencies`).

```tsx
import { ApiClientProvider, publicSettingsQuery, useApiClient } from '@galpon/api-client/react'
import { useQuery } from '@tanstack/react-query'

// <ApiClientProvider client={api}>...</ApiClientProvider>
function Settings() {
  const api = useApiClient() // lanza un error claro si falta el provider
  const settings = useQuery(publicSettingsQuery(api))
  return <p>{settings.data?.contactEmail}</p>
}
```

- `queryKeys`: `categories()`, `publicSettings()`, `adminSession()` y `adminCsrf()`. Sirven para consultar y para invalidar.
- Del dashboard, todas bajo `['admin', …]`: `adminDashboard()`, `adminProducts(query)`, `adminProduct(id)`, `adminCategories()`, `adminOrders(query)`, `adminOrder(number)`, `adminContent(page)`, `adminLegalContent(document)`, `adminSettings()`, `adminReviews(query)` y `adminMessages(query)`. Los prefijos `adminProductsAll()`, `adminOrdersAll()`, `adminReviewsAll()`, `adminMessagesAll()` y `adminContentAll()` invalidan juntos los listados y los detalles de cada grupo; después de una escritura que cambia un contador del resumen o del menú se invalida también `adminDashboard()`.
- Del checkout y la cuenta: `cartQuote(input)` (con el prefijo `cartQuotes()` para invalidarlas todas), `order(number)`, `installments(number, input)` y, bajo `account()` (para invalidar todo junto al iniciar o cerrar sesión), `customerCsrf()`, `me()`, `myOrders(page)`, `myOrder(number)` y `myAddresses()`.
- `publicSettingsQuery`, `adminSessionQuery`, `adminCsrfQuery` y `adminProductsQuery(api, query)`: `queryOptions` listas para `useQuery`, `useSuspenseQuery` o `queryClient.query`. Reintentan hasta dos veces solo los errores de red y de servidor (`shouldRetryQuery`): un 401 no hace esperar al admin. Del dashboard, con la misma política: `adminDashboardQuery`, `adminProductQuery(api, id)`, `adminCategoriesQuery`, `adminOrdersQuery(api, query)`, `adminOrderQuery(api, number)`, `adminContentQuery(api, page)` (los datos tienen el tipo de la página), `adminLegalContentQuery(api, document)`, `adminSettingsQuery`, `adminReviewsQuery(api, query)` y `adminMessagesQuery(api, query)`. De la tienda: `cartQuoteQuery`, `orderQuery`, `installmentsQuery`, `customerCsrfQuery`, `meQuery`, `myOrdersQuery`, `myOrderQuery` y `myAddressesQuery`. Las escrituras (crear el pedido, pagar, la cuenta, todo lo que guarda el dashboard) se usan con `useMutation` y los servicios.

## Modo de prueba

`@galpon/api-client/mock` trae la API simulada que usan la tienda y el admin mientras no hay backend (`API_MODE=mock`). `createMockFetch` devuelve un `fetch` que se pasa a `createApiClient({ fetch })`: quita el prefijo (`/api/mock/v1` o `/api/v1`), busca la ruta del contrato y corre su handler contra la base de `getDb()`.

```ts
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'

const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
const api = createApiClient({
  baseUrl: 'http://localhost:3000/api/mock/v1',
  fetch: createMockFetch({ getDb: () => db }),
})
```

**Latencia.** Por omisión cada respuesta tarda entre 150 y 400 ms (se sortea). `latencyMs: 0` responde sin esperar, y un número o un rango `[mín, máx]` fijan otra. Los tests usan `0`.

**Catálogo de ejemplo.** La base se siembra con las 6 líneas y los 27 productos del diseño (`src/mock/fixtures/`). 16 productos tienen las fotos que mandó el cliente, 19 en total: el Mate Imperial Premium tiene dos (la del diseño y otra con bombilla) y el Mate Torpedo Virola de Alpaca Cincelada, tres; los otros 11 no tienen y la tienda muestra el marco punteado. Los archivos están en `apps/store/public/mock-images/` y, iguales, en `apps/admin/public/mock-images/` (cada app los sirve desde su propio origen), con el slug del producto como nombre (`{slug}.jpg`, `{slug}-2.jpg`…); en el fixture, `publicId` es `galpon/productos/{archivo}`, `url` es `/mock-images/{archivo}.jpg` y las medidas son las reales. `fixtures.test.ts` comprueba que las dos copias estén, sean iguales y midan lo que dice el fixture. De las líneas, solo Imperiales tiene foto (la del Mate Imperial Premium).

**Rutas implementadas (P1).**

| Grupo     | Rutas                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo  | `GET /categories`, `/products` (filtros, orden y página), `/products/{slug}` (acepta slugs anteriores), `/products/{slug}/related` |
| Reseñas   | `GET /products/{slug}/reviews` (aprobadas, de a 10, con estadísticas), `/reviews/featured`                                         |
| Contenido | `GET /content/home`, `/about`, `/faq`, `/footer`, `/product-tabs` y `/legal/{document}`                                            |
| Ajustes   | `GET /settings/public` (sin alícuota de IVA ni umbral de stock)                                                                    |
| Admin     | `POST /admin/auth/login`, `/logout`, `GET /admin/auth/me`, `/csrf` y `GET /admin/products`                                         |

El login usa el email y la contraseña de `DEFAULT_MOCK_DB_OPTIONS`, abre una sesión de 8 horas y devuelve un `csrfToken` que las escrituras mandan en `X-CSRF-Token`.

**Checkout y cuenta (P3).** Los importes salen siempre de `@galpon/domain` (`productLineAmounts`, `kitLineAmounts`, `cartTotals`, `netPrice`, `remainingQuantityFor`, `installmentAmount`).

| Grupo   | Rutas y comportamiento                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carrito | `POST /cart/quote`: `issue` por línea (`unavailable`, `sold_out`, `quantity_reduced` y `price_changed` si la línea trae `expectedUnitPriceArs`, el precio de lista por unidad que la tienda tenía cotizado), netos con la alícuota de los ajustes. `POST /shipping/quote`: costo y plazo fijos del método.                                                                                                                                                                                                              |
| Pedidos | `POST /orders` exige `Idempotency-Key` (misma clave y cuerpo → la misma respuesta `201`; otro cuerpo → `422`), recalcula todo, responde `409` `stock_changed`, `price_changed` o `total_changed` con `changes`, reserva el stock 30 minutos y valida el acceso contra el SHA-256 del token (`tokenHash`; el token en claro queda también en `creation` para repetir el `201` con la misma clave). `GET /orders/{number}`: con `X-Order-Token` o la sesión del dueño; si venció la reserva, `expired` y libera el stock. |
| Pagos   | Un intento activo por pedido. La preferencia devuelve `initPoint = /checkout/mp-simulado?pedido=…&intent=…`. La tarjeta decide por el titular (`APRO`, `CONT`, `OTHE`, `FUND`, `SECU`, `EXPI`, `CALL` y `3DS`, que pide el desafío); aprobado → `paid` y descuenta el stock. Cuotas: las sin interés de los ajustes más 6 y 12 con CFT 45,90 % / TEA 38,00 %. `cancel-payment` cancela el intento activo.                                                                                                               |
| Cuenta  | Cookie `galpon_session` (`customerSessionCookie` de `createMockFetch` la cambia) y token CSRF ligado a la sesión: `GET /auth/csrf` abre una sesión anónima; registrarse o iniciar sesión la cambia (hay que pedir otro token). Los pedidos de invitado con el mismo email pasan a la cuenta al registrarse. `RESET-OK` (`MOCK_PASSWORD_RESET_TOKEN`) cambia la contraseña de la cuenta que la pidió último.                                                                                                             |

**Resultado del pago con tarjeta por titular.** Como en el sandbox de Mercado Pago, el nombre del titular decide qué pasa (sin distinguir mayúsculas ni espacios de los extremos). El número de tarjeta, el vencimiento y el código de seguridad no influyen, y el documento de prueba es el DNI `12345678` (el mock acepta cualquier documento válido).

| Titular               | `paymentStatus`   | `statusDetail`                         | Qué pasa con el pedido                                                                                                               |
| --------------------- | ----------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `APRO`                | `approved`        | `accredited`                           | Pasa a `paid` y descuenta el stock                                                                                                   |
| `CONT`                | `pending`         | `pending_contingency`                  | Sigue `pending_payment`; el pago queda en revisión                                                                                   |
| `OTHE`                | `rejected`        | `cc_rejected_other_reason`             | Sigue `pending_payment`; se puede reintentar                                                                                         |
| `FUND`                | `rejected`        | `cc_rejected_insufficient_amount`      | Ídem (fondos insuficientes)                                                                                                          |
| `SECU`                | `rejected`        | `cc_rejected_bad_filled_security_code` | Ídem (código de seguridad inválido)                                                                                                  |
| `EXPI`                | `rejected`        | `cc_rejected_bad_filled_date`          | Ídem (tarjeta vencida)                                                                                                               |
| `CALL`                | `rejected`        | `cc_rejected_call_for_authorize`       | Ídem (hay que autorizar el pago con el banco)                                                                                        |
| `3DS`                 | `action_required` | `pending_challenge`                    | Devuelve `challenge.url = /checkout/mp-simulado?pedido=…&challenge=1`; se resuelve en el simulador (aprobado, pendiente o rechazado) |
| cualquier otro nombre | `rejected`        | `cc_rejected_other_reason`             | Cuenta como `OTHE`, como en el sandbox                                                                                               |

Los campos simulados de tarjeta arman el token con `createMockCardToken({ cardholderName, lastFour })`: lleva el titular de prueba y los últimos 4 dígitos, nunca el número entero. El simulador de Mercado Pago es una ruta interna, fuera del contrato: `POST /api/v1/__mock/mercadopago/resolve` (`MOCK_MERCADOPAGO_RESOLVE_PATH`) con `{ number, intent, result }` (`intent: null` es el intento activo, por ejemplo el desafío 3-D Secure; `result`: `approved`, `pending` o `rejected`) aplica el resultado y devuelve `{ returnUrl: '/checkout/resultado?pedido=GLP-…' }`.

**Controles para probar escenarios.** Otras dos rutas internas, también fuera del contrato (`MOCK_CONTROL_ROUTES`), para los tests de extremo a extremo, que solo llegan a la base del servidor por HTTP (en la tienda, `/api/v1/__mock/…`):

- `POST /__mock/orders/{number}/expire` (`MOCK_EXPIRE_ORDER_PATH`) vence la reserva del pedido ahora: pasa a `expired`, libera el stock y cancela el intento de pago activo (`409 order_not_pending` si ya no esperaba el pago).
- `POST /__mock/products/{id}` (`MOCK_PRODUCT_PATH`) con `{ priceArs?, stock? }` cambia el precio o el stock del producto (al menos un campo) y avisa que cambió el catálogo. Sirve para provocar `409 price_changed`, `total_changed` y `stock_changed` antes de pagar.

**Dashboard (P4).** Todas las rutas `/admin/*` piden la sesión del admin (`401`) y las escrituras, además, el token CSRF (`403 csrf_invalid`).

| Grupo               | Rutas y comportamiento                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Productos y líneas  | `GET`/`POST /admin/products`, `GET`/`PATCH /admin/products/{id}` (`expectedUpdatedAt` distinto → `409 product_changed`; cambiar el slug guarda el anterior en `previousSlugs`; un slug de otro producto → `409 slug_taken`) y `POST …/archive`; `GET`/`POST /admin/categories`, `PUT /admin/categories/order` y `PATCH`/`DELETE /admin/categories/{id}`                                                                                                                                             |
| Fotos               | `POST /admin/media/signature` devuelve una firma falsa (`mock-…`). La foto se registra con la ruta interna `POST /__mock/media` (`MOCK_MEDIA_PATH`, fuera del contrato): `postMockMedia(fetch, baseUrl, { folder, dataUrl, width, height })` manda un data URL reducido (WebP, JPEG o PNG, hasta 200 000 caracteres, `MAX_MOCK_MEDIA_LENGTH`) y devuelve `{ publicId: '{carpeta}/mock-{uuid}', url }`. Se guardan hasta 40 (`MAX_MOCK_MEDIA`); pasado el cupo se borran las más viejas que nada usa |
| Resumen             | `GET /admin/dashboard/summary`: ventas de hoy y de los últimos 7 días de Buenos Aires (pedidos de `SOLD_ORDER_STATUSES`, según cuándo pasaron a `paid` en el historial), `ordersToShip`, `lowStock` (publicados con stock hasta `lowStockThreshold`, de menor a mayor), reseñas pendientes, mensajes sin leer y alertas de pago (contracargo, mediación y segundo pago aprobado, con el total en `formatPesos`)                                                                                     |
| Pedidos             | `GET /admin/orders` (`status` repetible, `paymentStatus` y `q` sobre número, nombre, apellido y email, sin distinguir acentos ni mayúsculas; del más nuevo al más viejo, de a 20), `GET /admin/orders/{number}` y `POST …/status` con las transiciones de `checkOrderTransition` (`409 invalid_status_transition` o `payment_in_progress`): deja la nota en el historial, guarda el seguimiento al despachar y, al cancelar, libera la reserva y cancela el intento activo                          |
| Contenido y ajustes | `GET`/`PUT /admin/content/{home,about,faq,footer,product-tabs}` y `/admin/content/legal/{terms,privacy}` (otro documento → `404`) y `GET`/`PUT /admin/settings`: validan con los schemas del formulario (`422` por campo), Nosotros resuelve las fotos de los socios y los ajustes conservan el nombre de cada envío. Cada `PUT` invalida su etiqueta (`content:home`, …, `content:legal-terms`, `settings`)                                                                                        |
| Moderación          | `GET /admin/reviews` (`status`, de a 20, con `product { slug, name }`), `PATCH /admin/reviews/{id}` (invalida `reviews:featured`, `reviews:{slug}` y `product:{slug}`), `GET /admin/messages` (`kind` y `read`) y `PATCH /admin/messages/{id}`                                                                                                                                                                                                                                                      |

**Datos de demostración del admin.** `createMockDb({ ...DEFAULT_MOCK_DB_OPTIONS, demo: 'admin', now })` (y `createPersistentMockDb` con `demo`, también al reiniciar) siembra `FIXTURE_ADMIN_DEMO` con fechas relativas a `now`: 12 pedidos, 8 mensajes (5 de contacto y 3 arrepentimientos, `ARR-000001` a `ARR-000003`; 3 sin leer) y 5 reseñas nuevas (4 pendientes y 1 oculta). Los importes salen de `priceCart` y `cartTotals`, como en `POST /orders`, y la demo no toca el stock. Sin `demo` (la tienda) no se siembra nada. El resumen da 3 para despachar, 4 reseñas pendientes, 3 mensajes sin leer, 3 alertas y, en poco stock, Mate Galleta (0) y Mate Coquito Criollo (2). Los pedidos que crea el mock siguen desde `GLP-10001`, así que no chocan con los de la demo.

| Pedido    | Estado            | Pago           | Detalle                                                                                                                     |
| --------- | ----------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GLP-09001 | `paid`            | `approved`     | Tarjeta de crédito, 3 cuotas, terminada en 4242; envío a domicilio (CABA); pagado hace 1 minuto                             |
| GLP-09002 | `paid`            | `approved`     | Mercado Pago, dinero en cuenta; retiro en persona; pagado hace 2 minutos; dos intentos aprobados (alerta de pago duplicado) |
| GLP-09003 | `preparing`       | `approved`     | Envío a sucursal; ayer                                                                                                      |
| GLP-09004 | `shipped`         | `approved`     | Andreani AND123456789; hace 3 días                                                                                          |
| GLP-09005 | `delivered`       | `approved`     | Hace 6 días                                                                                                                 |
| GLP-09006 | `pending_payment` | `none`         | Creado hace 10 minutos, reserva por 20 minutos más (se puede cancelar)                                                      |
| GLP-09007 | `pending_payment` | `pending`      | Pago en curso (no se puede cancelar)                                                                                        |
| GLP-09008 | `expired`         | `none`         | Hace 2 días                                                                                                                 |
| GLP-09009 | `cancelled`       | `none`         | Hace 4 días, nota "Pedido de prueba cancelado"                                                                              |
| GLP-09010 | `refunded`        | `refunded`     | Hace 9 días                                                                                                                 |
| GLP-09011 | `delivered`       | `charged_back` | Hace 12 días (alerta de contracargo)                                                                                        |
| GLP-09012 | `shipped`         | `in_dispute`   | Hace 5 días (alerta de mediación)                                                                                           |

**Solo del back.** El aviso de Mercado Pago (`POST /webhooks/mercadopago`, en `BACKEND_ONLY_OPERATIONS`) responde `501` con `title: 'No implementado en el modo de prueba'` y `detail: 'Lo atiende solo el back'`: en el modo de prueba lo reemplaza el simulador. `PENDING_OPERATIONS` (las que el modo de prueba todavía no atiende, `501` con `detail: 'Todavía no está en el modo de prueba'`) queda vacía desde P4. Una ruta desconocida responde `404` y un método que la ruta no admite, `405`, siempre como `application/problem+json`. `contract-coverage.test.ts` falla si una operación de `docs/api/openapi.yaml` no está en exactamente una de `IMPLEMENTED_ROUTES`, `PENDING_OPERATIONS` y `BACKEND_ONLY_OPERATIONS`.

**Base.** La base tiene versión (`MOCK_DB_VERSION`, hoy 3, con pedidos, clientes, sesiones, fotos simuladas y `updatedAt` en los productos): una guardada con otra versión se descarta y se vuelve a sembrar. `createMockDb` crea una base nueva (con `demo: 'admin'`, con los datos de demostración); `getGlobalMockDb` comparte una sola por proceso (el servidor de Next) y `createPersistentMockDb` la guarda en `sessionStorage` (el admin). La base no se guarda sola: quien llama a `onMutation` es `createMockFetch`, después de cada pedido que no es `GET` y responde 2xx, así que se le pasa `onMutation: handle.persist` (con `handle` lo que devuelve `createPersistentMockDb`). `onInvalidate` se llama cuando un handler avisa, con `ctx.invalidate`, que cambió algo que la tienda tiene en caché.

## Exports

`package.json` declara cinco puntos de entrada: `.` (`src/index.ts`: cliente, errores, servicios y los tipos del contrato), `./react` (`ApiClientProvider`, `useApiClient`, `queryKeys` y las consultas) y `./mock` (modo de prueba: `createMockFetch`, la base simulada, su persistencia, los tipos `MockRoute`, `MockContext` y `HttpMethod` para escribir handlers, `createMockCardToken`, `MOCK_MERCADOPAGO_RESOLVE_PATH`, `MOCK_PASSWORD_RESET_TOKEN`, `DEFAULT_CUSTOMER_SESSION_COOKIE` las rutas de control `MOCK_CONTROL_ROUTES`, `MOCK_EXPIRE_ORDER_PATH` y `MOCK_PRODUCT_PATH`, `postMockMedia` y `MOCK_MEDIA_PATH`, y `FIXTURE_ADMIN_DEMO`), `./mock/card-token` (solo `createMockCardToken`, `parseMockCardToken` y `MOCK_CARD_HOLDERS`, sin la base ni los handlers: es lo que usan los campos de tarjeta simulados del navegador para no arrastrar el modo de prueba entero) y `./mock/session-cookie` (solo `DEFAULT_CUSTOMER_SESSION_COOKIE`: lo importa `proxy.ts`, que corre también en vivo, y por eso no puede traer la base ni los handlers del modo de prueba).

## Tests

Los tests usan un `fetch` falso (`src/test/fake-fetch.ts`) que registra cada `Request` y devuelve la respuesta que se le indique. Los del dashboard usan `src/mock/test/admin-demo-api.ts` (`createAdminDemoApi(now?)`: base con los datos de demostración, sesión iniciada, reloj y registro de invalidaciones). Los del checkout y la cuenta usan `src/mock/test/checkout-api.ts`: la API simulada con cookies, token del pedido, token CSRF y un reloj que se adelanta. El de los hooks (`react/queries.test.ts`) corre en jsdom.
