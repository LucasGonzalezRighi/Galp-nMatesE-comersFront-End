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

| Archivo          | Servicios                                                                                                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`        | `listCategories`, `listProducts(api, query?)`, `listAllProducts(api, query?)` (junta las páginas de 100), `getProduct`, `listRelatedProducts`                                                                                       |
| `reviews`        | `listProductReviews(api, slug, page?)`, `listFeaturedReviews`                                                                                                                                                                       |
| `content`        | `getHomeContent`, `getAboutContent`, `getFaqContent`, `getFooterContent`, `getProductTabsContent`, `getLegalContent(api, 'terms' \| 'privacy')`                                                                                     |
| `settings`       | `getPublicSettings`                                                                                                                                                                                                                 |
| `admin-auth`     | `adminLogin`, `adminLogout`, `getAdminSession`, `getAdminCsrfToken`                                                                                                                                                                 |
| `admin-products` | `listAdminProducts(api, query?)`                                                                                                                                                                                                    |
| `cart`           | `quoteCart`, `quoteShipping`                                                                                                                                                                                                        |
| `orders`         | `createOrder(api, input, idempotencyKey)`, `getOrder(api, number)`                                                                                                                                                                  |
| `payments`       | `createMercadoPagoPreference(api, number, key)`, `payWithCard(api, number, input, key)`, `getInstallments`, `cancelPayment`                                                                                                         |
| `account`        | `getCustomerCsrfToken`, `register`, `login`, `logout`, `forgotPassword`, `resetPassword`, `getMe`, `updateMe`, `listMyOrders(api, page?)`, `getMyOrder`, `listMyAddresses`, `createMyAddress`, `updateMyAddress`, `deleteMyAddress` |

Los que reciben un número de pedido, una `Idempotency-Key` o el id de una dirección lanzan `RangeError` si no tienen formato (`GLP-` y cinco dígitos, un UUID, letras/números/guiones). La `Idempotency-Key` la genera la tienda una vez por intento y la reutiliza en los reintentos de red: con la misma clave el back devuelve el mismo pedido o el mismo resultado de pago.

`ProductQuery` y `AdminProductQuery` son los parámetros de `GET /products` y `GET /admin/products` según el contrato.

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

- `queryKeys`: `categories()`, `publicSettings()`, `adminSession()`, `adminCsrf()` y `adminProducts(query)`. Sirven para consultar y para invalidar.
- Del checkout y la cuenta: `cartQuote(input)`, `order(number)`, `installments(number, input)` y, bajo `account()` (para invalidar todo junto al iniciar o cerrar sesión), `customerCsrf()`, `me()`, `myOrders(page)`, `myOrder(number)` y `myAddresses()`.
- `publicSettingsQuery`, `adminSessionQuery`, `adminCsrfQuery` y `adminProductsQuery(api, query)`: `queryOptions` listas para `useQuery`, `useSuspenseQuery` o `queryClient.query`. Reintentan hasta dos veces solo los errores de red y de servidor (`shouldRetryQuery`): un 401 no hace esperar al admin. Con la misma política: `cartQuoteQuery`, `orderQuery`, `installmentsQuery`, `customerCsrfQuery`, `meQuery`, `myOrdersQuery`, `myOrderQuery` y `myAddressesQuery`. Las escrituras (crear el pedido, pagar, la cuenta) se usan con `useMutation` y los servicios.

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

**Pendientes.** Toda otra operación del contrato (`PENDING_OPERATIONS`) responde `501` con `title: 'No implementado en el modo de prueba'` y `detail: 'Llega en P3'` (el aviso de Mercado Pago, que reemplaza el simulador) o `P4` (el resto del admin). Una ruta desconocida responde `404` y un método que la ruta no admite, `405`, siempre como `application/problem+json`. `contract-coverage.test.ts` falla si una operación de `docs/api/openapi.yaml` no está en `IMPLEMENTED_ROUTES` ni en `PENDING_OPERATIONS`.

**Base.** La base tiene versión (`MOCK_DB_VERSION`, hoy 2, con pedidos, clientes y sesiones tipados): una guardada con otra versión se descarta y se vuelve a sembrar. `createMockDb` crea una base nueva; `getGlobalMockDb` comparte una sola por proceso (el servidor de Next) y `createPersistentMockDb` la guarda en `sessionStorage` (el admin). La base no se guarda sola: quien llama a `onMutation` es `createMockFetch`, después de cada pedido que no es `GET` y responde 2xx, así que se le pasa `onMutation: handle.persist` (con `handle` lo que devuelve `createPersistentMockDb`). `onInvalidate` se llama cuando un handler avisa, con `ctx.invalidate`, que cambió algo que la tienda tiene en caché.

## Exports

`package.json` declara cinco puntos de entrada: `.` (`src/index.ts`: cliente, errores, servicios y los tipos del contrato), `./react` (`ApiClientProvider`, `useApiClient`, `queryKeys` y las consultas) y `./mock` (modo de prueba: `createMockFetch`, la base simulada, su persistencia, los tipos `MockRoute`, `MockContext` y `HttpMethod` para escribir handlers, `createMockCardToken`, `MOCK_MERCADOPAGO_RESOLVE_PATH`, `MOCK_PASSWORD_RESET_TOKEN`, `DEFAULT_CUSTOMER_SESSION_COOKIE` y las rutas de control `MOCK_CONTROL_ROUTES`, `MOCK_EXPIRE_ORDER_PATH` y `MOCK_PRODUCT_PATH`), `./mock/card-token` (solo `createMockCardToken`, `parseMockCardToken` y `MOCK_CARD_HOLDERS`, sin la base ni los handlers: es lo que usan los campos de tarjeta simulados del navegador para no arrastrar el modo de prueba entero) y `./mock/session-cookie` (solo `DEFAULT_CUSTOMER_SESSION_COOKIE`: lo importa `proxy.ts`, que corre también en vivo, y por eso no puede traer la base ni los handlers del modo de prueba).

## Tests

Los tests usan un `fetch` falso (`src/test/fake-fetch.ts`) que registra cada `Request` y devuelve la respuesta que se le indique. Los del checkout y la cuenta usan `src/mock/test/checkout-api.ts`: la API simulada con cookies, token del pedido, token CSRF y un reloj que se adelanta. El de los hooks (`react/queries.test.ts`) corre en jsdom.
