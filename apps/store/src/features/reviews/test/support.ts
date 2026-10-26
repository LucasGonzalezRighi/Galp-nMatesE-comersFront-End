import type { ApiClient } from '@galpon/api-client'
import type { MockDb } from '@galpon/api-client/mock'
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'

/** API simulada de un test: cliente tipado y la base en memoria para mirar qué se guardó. */
export interface TestApi {
  /** Cliente que habla con la base simulada, sin latencia. */
  api: ApiClient
  /** Base simulada propia del test. */
  db: MockDb
}

/** Crea una base simulada nueva y un cliente que habla con ella sin demora. */
export function createTestApi(): TestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const api = createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch })
  return { api, db }
}

/** API que usa el formulario durante el test (la cambia {@link useFreshTestApi}). */
let current: TestApi = createTestApi()

/** Deja una API simulada nueva para el test que empieza y la devuelve. */
export function useFreshTestApi(): TestApi {
  current = createTestApi()
  return current
}

/** La API simulada del test en curso, para el `getBrowserApi` simulado. */
export function currentTestApi(): ApiClient {
  return current.api
}
