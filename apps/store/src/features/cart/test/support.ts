import type {
  ApiClient,
  ApiFetch,
  CartQuote,
  CartQuoteLine,
  ProductSummary,
} from '@galpon/api-client'
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

/**
 * Línea de una cotización para los tests: un producto suelto de $10.000 sin problemas, con su
 * precio sin impuestos nacionales.
 *
 * @param overrides - Campos que cambian; `key` es obligatoria.
 */
export function quoteLine(overrides: Partial<CartQuoteLine> & { key: string }): CartQuoteLine {
  return {
    detail: '',
    issue: null,
    kitSavingsArs: 0,
    maxQuantity: 10,
    name: `Producto ${overrides.key}`,
    netUnitPriceArs: 8264,
    totalArs: 10000,
    type: 'product',
    unitPriceArs: 10000,
    ...overrides,
  }
}

/**
 * Cotización para los tests. Si no se indican, los totales son la suma de los importes de las
 * líneas y el precio sin impuestos del subtotal está apagado (`null`).
 *
 * @param lines - Líneas cotizadas.
 * @param overrides - Totales que cambian.
 */
export function cartQuote(
  lines: readonly CartQuoteLine[],
  overrides: Partial<Omit<CartQuote, 'lines'>> = {},
): CartQuote {
  const subtotalArs = lines.reduce((total, line) => total + line.totalArs, 0)
  const kitSavingsArs = lines.reduce((total, line) => total + line.kitSavingsArs, 0)
  return {
    lines: [...lines],
    itemsGrossArs: subtotalArs + kitSavingsArs,
    kitSavingsArs,
    subtotalArs,
    netSubtotalArs: null,
    ...overrides,
  }
}

/** API simulada de un test: cliente tipado y la base en memoria para modificar antes de consultar. */
export interface TestApi {
  /** Cliente que habla con la base simulada, sin latencia. */
  api: ApiClient
  /** Base simulada propia del test. */
  db: MockDb
  /** Copia de cada pedido que hizo el cliente, en orden, para comprobar qué se pidió. */
  requests: Request[]
}

/** Crea una base simulada nueva y un cliente que habla con ella sin demora y anota sus pedidos. */
export function createTestApi(): TestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const requests: Request[] = []
  const fetch: ApiFetch = (request) => {
    requests.push(request.clone())
    return mockFetch(request)
  }
  const api = createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch })
  return { api, db, requests }
}
