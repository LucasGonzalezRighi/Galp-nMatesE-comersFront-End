# @galpon/api-client

Cliente de la API de Galpón Mates (sección 13 del spec): los tipos del contrato, el cliente tipado, los errores, los servicios y los hooks de TanStack Query. El modo de prueba (`@galpon/api-client/mock`) llega en una tarea posterior del plan.

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
})
```

`createApiClient` devuelve un cliente de [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) tipado con `paths`. Agrega `Accept: application/json` a todo pedido y, si `getCsrfToken` devuelve un token, `X-CSRF-Token` a los que no son `GET` ni `HEAD`. `baseUrl` tiene que ser absoluta (`http` o `https`): en Node una relativa falla, y con otra cosa `createApiClient` lanza `RangeError`. `fetch` es opcional (por omisión, el global) y los tests pasan uno falso que recibe el `Request`.

## Errores

Todo lo que falla llega como `ApiError`:

| Propiedad           | Qué es                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`              | `validation` (400, 422 y otros 4xx), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `rate_limited` (429), `server` (5xx) o `network` (no hubo respuesta) |
| `status`            | El estado HTTP, o `null` si no hubo respuesta                                                                                                                                           |
| `problem`           | El `application/problem+json` del servidor, o `null` si no lo trajo                                                                                                                     |
| `fieldErrors`       | El primer mensaje de cada campo, por ruta (`customer.email`); vacío si no hay detalle                                                                                                   |
| `retryAfterSeconds` | Los segundos de `Retry-After`, o `null`                                                                                                                                                 |
| `message`           | El `detail` (o `title`) del problema; si no hay, un texto en español según el `kind`                                                                                                    |

`isApiError(error)` es el type guard. `apiErrorFromResponse(response, body)` y `networkError(cause)` arman el error; `unwrap(call)` y `unwrapVoid(call)` desenvuelven una llamada de `openapi-fetch` (`api.GET(...)`) y devuelven los datos o lanzan el `ApiError`. Los servicios ya las usan.

## Servicios

Cada servicio recibe el `ApiClient` como primer argumento y devuelve los datos ya tipados o lanza `ApiError`. Los que reciben un slug, una página o un documento lanzan `RangeError` si el valor no sirve para armar la ruta; el formato del slug lo valida el servidor.

| Archivo          | Servicios                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog`        | `listCategories`, `listProducts(api, query?)`, `listAllProducts(api, query?)` (junta las páginas de 100), `getProduct`, `listRelatedProducts`   |
| `reviews`        | `listProductReviews(api, slug, page?)`, `listFeaturedReviews`                                                                                   |
| `content`        | `getHomeContent`, `getAboutContent`, `getFaqContent`, `getFooterContent`, `getProductTabsContent`, `getLegalContent(api, 'terms' \| 'privacy')` |
| `settings`       | `getPublicSettings`                                                                                                                             |
| `admin-auth`     | `adminLogin`, `adminLogout`, `getAdminSession`, `getAdminCsrfToken`                                                                             |
| `admin-products` | `listAdminProducts(api, query?)`                                                                                                                |

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
- `publicSettingsQuery`, `adminSessionQuery`, `adminCsrfQuery` y `adminProductsQuery(api, query)`: `queryOptions` listas para `useQuery`, `useSuspenseQuery` o `queryClient.query`. Reintentan hasta dos veces solo los errores de red y de servidor (`shouldRetryQuery`): un 401 no hace esperar al admin.

## Exports

`package.json` declara tres puntos de entrada: `.` (`src/index.ts`: cliente, errores, servicios y los tipos del contrato), `./react` (`ApiClientProvider`, `useApiClient`, `queryKeys` y las consultas) y `./mock` (modo de prueba, que se crea en una tarea posterior).

## Tests

Los tests usan un `fetch` falso (`src/test/fake-fetch.ts`) que registra cada `Request` y devuelve la respuesta que se le indique. El de los hooks (`react/queries.test.ts`) corre en jsdom.
