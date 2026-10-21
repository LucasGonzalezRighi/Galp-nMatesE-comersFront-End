import type { ApiClient } from '@galpon/api-client'
import type { StorageLike } from '@galpon/api-client/mock'
import { createApiClient } from '@galpon/api-client'
import { createMockFetch, createPersistentMockDb } from '@galpon/api-client/mock'
import type { AdminEnv } from './env'

/** Clave de `sessionStorage` donde el modo de prueba guarda su base (sobrevive a las recargas). */
const MOCK_STORAGE_KEY = 'galpon.admin.mock.v1'

/**
 * Dirección que ve el cliente en modo de prueba. El `fetch` simulado responde en memoria, así que
 * nunca sale a la red; el dominio `.invalid` está reservado para que jamás resuelva.
 */
const MOCK_BASE_URL = 'http://mock.invalid/api/v1'

/** Estado del modo de prueba que muestra el dashboard. */
export interface MockStatus {
  /** `false` si los cambios se pierden al recargar (no hay `sessionStorage` o dejó de funcionar). */
  readonly isPersistent: boolean
}

/** Lo que arma {@link createAdminApi}. */
export interface AdminApi {
  /** Cliente de la API: el simulado en modo de prueba o el real en `live`. */
  api: ApiClient
  /** Estado del modo de prueba, o `null` en `live`. `isPersistent` se lee en cada acceso. */
  mockStatus: MockStatus | null
  /** Guarda (o borra con `undefined`) el token anti-CSRF que el cliente manda en las escrituras. */
  setCsrfToken: (token: string | undefined) => void
}

/**
 * Crea la API del dashboard según el modo configurado.
 *
 * En modo de prueba, el cliente usa un `fetch` en memoria sobre una base que se guarda en
 * `storage` después de cada escritura; un `createAdminApi` nuevo con el mismo almacenamiento
 * retoma lo hecho (es lo que pasa al recargar). En `live` llama a `${apiBaseUrl}/api/v1` con
 * cookies (`credentials: 'include'`).
 *
 * @param env - Configuración validada con `parseAdminEnv`.
 * @param storage - Dónde guardar la base de prueba (`safeSessionStorage()`), o `null` para
 *   trabajar solo en memoria.
 * @returns El cliente, el estado del modo de prueba y el setter del token CSRF.
 * @throws {RangeError} Si `env` está en `live` sin `apiBaseUrl`.
 */
export function createAdminApi(env: AdminEnv, storage: StorageLike | null): AdminApi {
  let csrfToken: string | undefined
  const getCsrfToken = () => csrfToken
  const setCsrfToken = (token: string | undefined) => {
    csrfToken = token
  }

  if (env.apiMode === 'live') {
    if (env.apiBaseUrl === null) {
      throw new RangeError('createAdminApi necesita apiBaseUrl cuando apiMode es "live".')
    }
    const api = createApiClient({
      baseUrl: `${env.apiBaseUrl}/api/v1`,
      credentials: 'include',
      getCsrfToken,
    })
    return { api, mockStatus: null, setCsrfToken }
  }

  const mockDb = createPersistentMockDb({
    adminEmail: env.mockAdminEmail,
    adminPassword: env.mockAdminPassword,
    storage,
    key: MOCK_STORAGE_KEY,
  })
  const api = createApiClient({
    baseUrl: MOCK_BASE_URL,
    fetch: createMockFetch({
      getDb: () => mockDb.db,
      latencyMs: env.mockLatencyMs,
      onMutation: () => {
        mockDb.persist()
      },
    }),
    getCsrfToken,
  })
  return {
    api,
    mockStatus: {
      get isPersistent() {
        return mockDb.isPersistent
      },
    },
    setCsrfToken,
  }
}
