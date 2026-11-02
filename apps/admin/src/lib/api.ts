import type { ApiClient } from '@galpon/api-client'
import type {
  MockMediaInput,
  MockMediaResult,
  PersistentMockDb,
  StorageLike,
} from '@galpon/api-client/mock'
import { createApiClient } from '@galpon/api-client'
import { createMockFetch, createPersistentMockDb, postMockMedia } from '@galpon/api-client/mock'
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

/**
 * Registra en la API simulada una foto ya reducida (un data URL) y devuelve su `publicId` y su
 * `url`. Reemplaza la subida a Cloudinary en el modo de prueba.
 */
export type RegisterMockImage = (input: MockMediaInput) => Promise<MockMediaResult>

/** Opciones de {@link createAdminApi} que solo cambian los tests. */
export interface AdminApiOptions {
  /** Con `false` la base de prueba se siembra sin los datos de demostración. Por omisión `true`. */
  demo?: boolean
  /** Reloj de la API simulada (vencimientos y fechas de la demostración); por omisión la hora actual. */
  now?: () => Date
}

/** Lo que arma {@link createAdminApi}. */
export interface AdminApi {
  /** Cliente de la API: el simulado en modo de prueba o el real en `live`. */
  api: ApiClient
  /** Estado del modo de prueba, o `null` en `live`. `isPersistent` se lee en cada acceso. */
  mockStatus: MockStatus | null
  /** Guarda (o borra con `undefined`) el token anti-CSRF que el cliente manda en las escrituras. */
  setCsrfToken: (token: string | undefined) => void
  /**
   * La base simulada con su persistencia (los tests la leen y la modifican; "Reiniciar los datos de
   * prueba" llama a `reset`), o `null` en `live`.
   */
  mockDb: PersistentMockDb | null
  /** En modo de prueba registra una foto reducida en la base simulada; en `live` es `null`. */
  registerMockImage: RegisterMockImage | null
}

/**
 * Crea la API del dashboard según el modo configurado.
 *
 * En modo de prueba, el cliente usa un `fetch` en memoria sobre una base sembrada con los datos
 * de demostración del admin (`demo: 'admin'`: pedidos, mensajes y reseñas a moderar) que se guarda
 * en `storage` después de cada escritura; un `createAdminApi` nuevo con el mismo almacenamiento
 * retoma lo hecho (es lo que pasa al recargar). En `live` llama a `${apiBaseUrl}/api/v1` con
 * cookies (`credentials: 'include'`).
 *
 * @param env - Configuración validada con `parseAdminEnv`.
 * @param storage - Dónde guardar la base de prueba (`safeSessionStorage()`), o `null` para
 *   trabajar solo en memoria.
 * @param options - Ver {@link AdminApiOptions}; la app no las usa.
 * @returns El cliente, el estado del modo de prueba, el setter del token CSRF, la base simulada
 *   y el registro de fotos simuladas (estos dos, `null` en `live`).
 * @throws {RangeError} Si `env` está en `live` sin `apiBaseUrl`.
 */
export function createAdminApi(
  env: AdminEnv,
  storage: StorageLike | null,
  options: AdminApiOptions = {},
): AdminApi {
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
    return { api, mockStatus: null, setCsrfToken, mockDb: null, registerMockImage: null }
  }

  const now = options.now ?? (() => new Date())
  const mockDb = createPersistentMockDb({
    adminEmail: env.mockAdminEmail,
    adminPassword: env.mockAdminPassword,
    ...(options.demo === false ? {} : { demo: 'admin' as const }),
    now: now(),
    storage,
    key: MOCK_STORAGE_KEY,
  })
  const mockFetch = createMockFetch({
    getDb: () => mockDb.db,
    latencyMs: env.mockLatencyMs,
    now,
    onMutation: () => {
      mockDb.persist()
    },
  })
  const api = createApiClient({ baseUrl: MOCK_BASE_URL, fetch: mockFetch, getCsrfToken })
  return {
    api,
    mockStatus: {
      get isPersistent() {
        return mockDb.isPersistent
      },
    },
    setCsrfToken,
    mockDb,
    registerMockImage: (input) => postMockMedia(mockFetch, MOCK_BASE_URL, input),
  }
}
