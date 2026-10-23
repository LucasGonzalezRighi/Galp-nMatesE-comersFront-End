import type { ApiClient, ProductSummary } from '@galpon/api-client'
import type { MockDb } from '@galpon/api-client/mock'
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'

/**
 * Producto del catálogo para los tests, con valores razonables (un mate de $10.000 con stock 10).
 *
 * @param overrides - Campos que cambian; `id` es obligatorio.
 */
export function summary(overrides: Partial<ProductSummary> & { id: string }): ProductSummary {
  return {
    categoryId: 'cat-imperiales',
    categoryName: 'Imperiales',
    categorySlug: 'imperiales',
    code: 'N°01',
    description: 'Descripción.',
    featured: false,
    group: 'mate',
    isPurchasable: true,
    isSoldOut: false,
    mainImage: null,
    maxQuantity: 10,
    name: `Producto ${overrides.id}`,
    netPriceArs: 8264,
    priceArs: 10000,
    rating: { average: 0, count: 0 },
    slug: overrides.id,
    ...overrides,
  }
}

/** API simulada de un test: cliente tipado y la base en memoria para modificar antes de consultar. */
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
