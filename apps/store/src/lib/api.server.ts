import 'server-only'
import type { ApiClient } from '@galpon/api-client'
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
