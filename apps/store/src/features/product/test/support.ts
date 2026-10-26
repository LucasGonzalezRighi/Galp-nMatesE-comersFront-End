import type { ApiClient, ProductDetail, ProductSummary } from '@galpon/api-client'
import type { MockDb } from '@galpon/api-client/mock'
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'

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

/** API que usan las lecturas del servidor durante el test (la cambia {@link useFreshTestApi}). */
let current: TestApi = createTestApi()

/** Deja una API simulada nueva para el test que empieza y la devuelve. */
export function useFreshTestApi(): TestApi {
  current = createTestApi()
  return current
}

/** La API simulada del test en curso, para el `getServerApi` simulado. */
export function currentTestApi(): ApiClient {
  return current.api
}

/** Producto de la ficha para los tests: un mate de $39.999 con stock 10, salvo lo que se cambie. */
export function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: 'prd-imperial-premium',
    categoryId: 'cat-imperiales',
    categoryName: 'Imperiales',
    categorySlug: 'imperiales',
    code: 'N°07',
    description: 'Imperial con virola de alpaca.',
    featured: true,
    group: 'mate',
    isPurchasable: true,
    isSoldOut: false,
    mainImage: null,
    maxQuantity: 10,
    name: 'Mate Imperial Premium',
    netPriceArs: 33057,
    priceArs: 39999,
    rating: { average: 4.7, count: 3 },
    slug: 'mate-imperial-premium',
    images: [],
    options: {
      leathers: ['Negro', 'Marrón', 'Crudo', 'Borravino'],
      ferrules: ['Alpaca lisa', 'Alpaca cincelada', 'Acero'],
    },
    tabs: {
      descriptionNote: 'Cada pieza es artesanal.',
      materials: 'Calabaza, cuero y alpaca.',
      shipping: 'Envíos a todo el país.',
      care: 'Curalo antes de usarlo.',
    },
    ...overrides,
  }
}

/** Resumen de un producto para las tarjetas de relacionados. */
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
