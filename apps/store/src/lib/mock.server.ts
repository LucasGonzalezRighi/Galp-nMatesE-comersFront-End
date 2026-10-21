import 'server-only'
import { revalidateTag } from 'next/cache'
import type { ApiFetch } from '@galpon/api-client'
import { createMockFetch, DEFAULT_MOCK_DB_OPTIONS, getGlobalMockDb } from '@galpon/api-client/mock'
import { getStoreEnv } from './env'
import { revalidationProfileFor } from './revalidate'

let mockFetch: ApiFetch | undefined

/**
 * `fetch` de la API simulada, el mismo para los Server Components y para el route handler
 * `/api/mock/v1`. Trabaja sobre la base única del proceso (`getGlobalMockDb`), así que ven los
 * mismos datos; las funciones `'use cache'` también lo usan porque corren durante el build.
 *
 * Cuando una escritura cambia datos con caché, regenera las etiquetas con `revalidateTag`.
 */
export function getStoreMockFetch(): ApiFetch {
  mockFetch ??= createMockFetch({
    getDb: () => getGlobalMockDb(DEFAULT_MOCK_DB_OPTIONS),
    latencyMs: getStoreEnv().mockLatencyMs,
    onInvalidate: (tags) => {
      for (const tag of tags) revalidateTag(tag, revalidationProfileFor(tag))
    },
  })
  return mockFetch
}
