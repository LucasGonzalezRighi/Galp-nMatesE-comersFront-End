import { cacheLife, cacheTag } from 'next/cache'
import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '@galpon/api-client'
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { getPublishedProducts } from './catalog'

/** API que devuelve `getServerApi` en la prueba. */
interface ServerApi {
  /** Cliente con la base simulada, o `null` antes de crearlo. */
  api: ApiClient | null
}

/** API simulada del servidor, con la base de prueba. */
const server = vi.hoisted((): ServerApi => ({ api: null }))

// Las lecturas del servidor ('use cache' y 'server-only') no corren en las pruebas: se simulan.
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock('../api.server', () => ({ getServerApi: () => server.api }))

describe('getPublishedProducts', () => {
  it('lee todo el catálogo publicado con la etiqueta de revalidación "products"', async () => {
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    server.api = createApiClient({
      baseUrl: 'http://localhost/api/v1',
      fetch: createMockFetch({ getDb: () => db, latencyMs: 0 }),
    })

    const products = await getPublishedProducts()

    const published = db.products.filter((product) => product.status === 'published')
    expect(products.map((product) => product.slug).sort()).toEqual(
      published.map((product) => product.slug).sort(),
    )
    expect(cacheLife).toHaveBeenCalledWith('hours')
    expect(cacheTag).toHaveBeenCalledWith('products')
  })
})
