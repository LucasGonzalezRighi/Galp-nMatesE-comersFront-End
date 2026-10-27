import 'server-only'
import { revalidateTag } from 'next/cache'
import type { ApiFetch } from '@galpon/api-client'
import { createMockFetch, DEFAULT_MOCK_DB_OPTIONS, getGlobalMockDb } from '@galpon/api-client/mock'
import { getStoreEnv } from './env'
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
 * que no cumplen `REVALIDATE_TAG_PATTERN` se ignoran. Hoy ningún handler del mock invalida
 * etiquetas: llega con las escrituras de P2–P4.
 */
export function getStoreMockFetch(): ApiFetch {
  mockFetch ??= createMockFetch({
    getDb: () => getGlobalMockDb(DEFAULT_MOCK_DB_OPTIONS),
    latencyMs: serverLatency(getStoreEnv().mockLatencyMs),
    onInvalidate: (tags) => {
      revalidateValidTags(tags, revalidateTag)
    },
  })
  return mockFetch
}
