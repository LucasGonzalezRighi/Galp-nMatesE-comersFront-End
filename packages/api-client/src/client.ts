import type { Client } from 'openapi-fetch'
import createClient from 'openapi-fetch'
import type { paths } from './generated/schema'

/** Un `fetch` que recibe el `Request` ya armado, como el que usa `openapi-fetch`. */
export type ApiFetch = (request: Request) => Promise<Response>

/** Opciones de {@link createApiClient}. */
export interface ApiClientOptions {
  /**
   * URL absoluta de la API, con el prefijo de versión (por ejemplo `http://localhost:4000/api/v1`).
   * Tiene que ser absoluta: en Node una relativa no se puede convertir en `Request`.
   */
  baseUrl: string
  /** `fetch` a usar; por omisión el global. Los tests pasan uno falso. */
  fetch?: ApiFetch
  /** Si los pedidos mandan las cookies; el admin usa `'include'` cuando la API está en otro origen. */
  credentials?: RequestCredentials
  /** Devuelve el token anti-CSRF vigente (se llama en cada pedido) o `undefined` si no hay sesión. */
  getCsrfToken?: () => string | undefined
  /**
   * Devuelve el token del pedido en curso (se llama en cada pedido) o `undefined` si no hay. Va en
   * `X-Order-Token`, solo en las rutas de un pedido (`/orders/{number}…`), nunca en la URL.
   */
  getOrderToken?: () => string | undefined
}

/** Cliente tipado de `openapi-fetch` para las rutas del contrato (`docs/api/openapi.yaml`). */
export type ApiClient = Client<paths>

/**
 * Indica si la ruta es la de un pedido público (`/orders/{number}` y sus pagos), que es la única
 * que lleva el token del pedido; `/me/orders/…` y `/admin/orders/…` usan la sesión.
 */
function isOrderPath(pathname: string): boolean {
  const segments = pathname.split('/')
  return segments.some(
    (segment, index) =>
      segment === 'orders' &&
      (segments[index + 1] ?? '') !== '' &&
      segments[index - 1] !== 'me' &&
      segments[index - 1] !== 'admin',
  )
}

/** Valida y devuelve el `baseUrl`. */
function parseBaseUrl(baseUrl: string): string {
  let url: URL | null = null
  try {
    url = new URL(baseUrl)
  } catch {
    // Se informa abajo, con el mismo mensaje que si el protocolo no es http(s).
  }
  if (url?.protocol !== 'http:' && url?.protocol !== 'https:') {
    throw new RangeError(
      `createApiClient necesita un baseUrl absoluto con http o https (por ejemplo "http://localhost:4000/api/v1"), y recibió ${JSON.stringify(baseUrl)}`,
    )
  }
  return baseUrl.trim()
}

/**
 * Crea el cliente de la API.
 *
 * Agrega `Accept: application/json` a todos los pedidos; cuando `getCsrfToken` devuelve un token,
 * `X-CSRF-Token` a los que no son `GET` ni `HEAD`, y cuando `getOrderToken` devuelve uno,
 * `X-Order-Token` a los de `/orders/{number}…`.
 *
 * Los métodos devuelven `{ data, error, response }`; para obtener los datos o un
 * {@link ApiError} usá `unwrap` (los servicios ya lo hacen).
 *
 * @param options - Ver {@link ApiClientOptions}.
 * @throws {RangeError} Si `baseUrl` no es una URL absoluta con `http` o `https`.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const { fetch, credentials, getCsrfToken, getOrderToken } = options
  const client = createClient<paths>({
    baseUrl: parseBaseUrl(options.baseUrl),
    ...(fetch === undefined ? {} : { fetch }),
    ...(credentials === undefined ? {} : { credentials }),
  })
  client.use({
    onRequest({ request }) {
      request.headers.set('Accept', 'application/json')
      const orderToken = getOrderToken?.()
      if (orderToken && isOrderPath(new URL(request.url).pathname)) {
        request.headers.set('X-Order-Token', orderToken)
      }
      if (request.method === 'GET' || request.method === 'HEAD') return
      const token = getCsrfToken?.()
      if (token) request.headers.set('X-CSRF-Token', token)
    },
  })
  return client
}
