import 'server-only'
import { revalidateTag } from 'next/cache'
import type { ApiFetch } from '@galpon/api-client'
import type { MockDbOptions } from '@galpon/api-client/mock'
import { createMockFetch, DEFAULT_MOCK_DB_OPTIONS, getGlobalMockDb } from '@galpon/api-client/mock'
import { getStoreEnv } from './env'
import { allowsMockControls, passwordResetNotice, storeMockAdminPassword } from './mock-access'
import { revalidateValidTags } from './revalidate'

let mockFetch: ApiFetch | undefined

/**
 * Latencia fija para el proceso de Next: con un rango se usa el mínimo. Next marca `Math.random()`
 * como valor inestable cuando prerenderiza una ruta dinámica (`/cuenta/*`) y lo informa como error
 * en cada pedido; el admin, que corre su propia API simulada en el navegador, conserva el rango.
 */
function serverLatency(latency: number | readonly [number, number]): number {
  return typeof latency === 'number' ? latency : latency[0]
}

/**
 * `fetch` de la API simulada, el mismo para los Server Components y para el route handler
 * `/api/mock/v1`. Trabaja sobre la base única del proceso (`getGlobalMockDb`), así que ven los
 * mismos datos; las funciones `'use cache'` también lo usan porque corren durante el build.
 *
 * Cuando una escritura cambia datos con caché, regenera las etiquetas con `revalidateTag`; las
 * que no cumplen `REVALIDATE_TAG_PATTERN` se ignoran. El admin de la API simulada entra con
 * `MOCK_ADMIN_PASSWORD` o, fuera de producción, con la contraseña de fábrica; los controles de
 * escenarios responden en producción solo con `MOCK_CONTROL_SECRET`; y el enlace para cambiar la
 * contraseña, que en vivo llega por mail, se escribe en el log del servidor.
 */
export function getStoreMockFetch(): ApiFetch {
  if (mockFetch !== undefined) return mockFetch
  const env = getStoreEnv()
  const dbOptions: MockDbOptions = {
    adminEmail: DEFAULT_MOCK_DB_OPTIONS.adminEmail,
    adminPassword: storeMockAdminPassword(env, DEFAULT_MOCK_DB_OPTIONS.adminPassword),
  }
  mockFetch = createMockFetch({
    getDb: () => getGlobalMockDb(dbOptions),
    latencyMs: serverLatency(env.mockLatencyMs),
    onInvalidate: (tags) => {
      revalidateValidTags(tags, revalidateTag)
    },
    onPasswordReset: (mail) => {
      process.stdout.write(`${passwordResetNotice(env.siteUrl, mail)}\n`)
    },
    allowControl: (request) => allowsMockControls(env, request),
  })
  return mockFetch
}
