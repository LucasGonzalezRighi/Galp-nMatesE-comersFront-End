import type { ApiClient, ApiFetch } from '../client'
import type { MockFetchOptions } from '../mock/mock-fetch'
import type { MockDb } from '../mock/types'
import { createApiClient } from '../client'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from '../mock/db'
import { createMockFetch } from '../mock/mock-fetch'
import { adminLogin } from '../services'

/** URL base con la que los tests hablan con la API simulada. */
export const MOCK_ORIGIN = 'http://localhost'

/** API simulada lista para un test: base nueva, `fetch` sin latencia y cliente tipado. */
export interface MockApi {
  /** Cliente tipado que usa el `fetch` simulado. */
  api: ApiClient
  /** Base simulada propia del test (se puede modificar antes de consultar). */
  db: MockDb
  /** El `fetch` simulado, para mandar pedidos crudos. */
  fetch: ApiFetch
  /** Cambia el token CSRF que manda el cliente en las escrituras. */
  setCsrfToken(token: string | undefined): void
}

/**
 * Crea una base simulada nueva y un cliente que habla con ella sin latencia.
 *
 * @param options - Opciones extra de `createMockFetch` (por ejemplo `now` u `onMutation`).
 */
export function createMockApi(options: Partial<Omit<MockFetchOptions, 'getDb'>> = {}): MockApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const fetch = createMockFetch({ getDb: () => db, latencyMs: 0, ...options })
  let csrfToken: string | undefined
  const api = createApiClient({
    baseUrl: `${MOCK_ORIGIN}/api/mock/v1`,
    fetch,
    getCsrfToken: () => csrfToken,
  })
  return {
    api,
    db,
    fetch,
    setCsrfToken(token) {
      csrfToken = token
    },
  }
}

/**
 * Inicia sesión con la cuenta de fábrica y deja el token CSRF puesto en el cliente.
 *
 * @returns El token CSRF de la sesión.
 */
export async function loginAsAdmin(mock: MockApi): Promise<string> {
  const session = await adminLogin(mock.api, {
    email: DEFAULT_MOCK_DB_OPTIONS.adminEmail,
    password: DEFAULT_MOCK_DB_OPTIONS.adminPassword,
  })
  mock.setCsrfToken(session.csrfToken)
  return session.csrfToken
}

/**
 * Manda un pedido crudo a la API simulada, con la ruta relativa a `/api/v1`.
 *
 * @param mock - API simulada del test.
 * @param path - Ruta con su query, por ejemplo `/products?pageSize=101`.
 * @param init - Método, cabeceras y cuerpo.
 */
export function rawRequest(mock: MockApi, path: string, init?: RequestInit): Promise<Response> {
  return mock.fetch(new Request(`${MOCK_ORIGIN}/api/v1${path}`, init))
}
