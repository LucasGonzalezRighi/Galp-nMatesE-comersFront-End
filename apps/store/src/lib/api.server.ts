import 'server-only'
import type { ApiClient, ApiFetch } from '@galpon/api-client'
import { createApiClient } from '@galpon/api-client'
import { getStoreEnv } from './env'
import { getStoreMockFetch } from './mock.server'

/** Dirección ficticia de la API simulada: nunca sale a la red, la atiende `getStoreMockFetch`. */
const MOCK_BASE_URL = 'http://mock.internal/api/v1'

let serverApi: ApiClient | undefined

/**
 * Cliente de la API para los Server Components y las funciones `'use cache'`.
 *
 * En modo de prueba habla con la API simulada en el mismo proceso; en vivo, directo con
 * `API_BASE_URL`.
 *
 * @throws {EnvError} Si el entorno no es válido.
 */
export function getServerApi(): ApiClient {
  if (serverApi !== undefined) return serverApi
  const env = getStoreEnv()
  if (env.apiMode === 'mock') {
    serverApi = createApiClient({ baseUrl: MOCK_BASE_URL, fetch: getStoreMockFetch() })
  } else {
    if (env.apiBaseUrl === null) throw new Error('Falta API_BASE_URL con API_MODE=live.')
    serverApi = createApiClient({ baseUrl: `${env.apiBaseUrl}/api/v1` })
  }
  return serverApi
}

/** Una cookie del pedido entrante. */
export interface IncomingCookie {
  /** Nombre de la cookie. */
  name: string
  /** Valor, ya decodificado. */
  value: string
}

/** Cookies del pedido entrante, con la forma de las que devuelve `cookies()` de `next/headers`. */
export interface IncomingCookies {
  /** Todas las cookies del pedido. */
  getAll: () => IncomingCookie[]
}

/**
 * Cliente de la API para las lecturas de un usuario en los Server Components (el área del
 * cliente, `/cuenta/*`): manda a la API las cookies del pedido entrante (la de la sesión), como
 * lo haría el navegador. En modo de prueba va a la API simulada del proceso con la cabecera
 * `Cookie`; en vivo, a `API_BASE_URL`.
 *
 * Se crea uno por pedido y **nunca** se usa dentro de `'use cache'`: los datos son de cada
 * persona. Para lo público está {@link getServerApi}.
 *
 * @param cookies - Cookies del pedido (`await cookies()`).
 * @throws {EnvError} Si el entorno no es válido.
 * @example
 * const api = getServerApiForRequest(await cookies())
 * const customer = await getMe(api)
 */
export function getServerApiForRequest(cookies: IncomingCookies): ApiClient {
  const header = cookies
    .getAll()
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join('; ')
  const withCookies =
    (send: ApiFetch): ApiFetch =>
    (request) => {
      if (header !== '') request.headers.set('Cookie', header)
      return send(request)
    }
  const env = getStoreEnv()
  if (env.apiMode === 'mock') {
    return createApiClient({ baseUrl: MOCK_BASE_URL, fetch: withCookies(getStoreMockFetch()) })
  }
  if (env.apiBaseUrl === null) throw new Error('Falta API_BASE_URL con API_MODE=live.')
  return createApiClient({
    baseUrl: `${env.apiBaseUrl}/api/v1`,
    fetch: withCookies((request) => fetch(request)),
  })
}
