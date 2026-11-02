import type {
  Category,
  FeaturedReview,
  HomeContent,
  ProductSummary,
  PublicSettings,
} from '@galpon/api-client'
import {
  createApiClient,
  getHomeContent,
  getPublicSettings,
  listAllProducts,
  listCategories,
  listFeaturedReviews,
} from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'

/** Lo que la tienda lee de la API para armar el inicio, tomado de la base simulada de fábrica. */
export interface FixtureCatalog {
  /** Los productos publicados, en el orden del listado. */
  products: ProductSummary[]
  /** Las líneas de producto. */
  categories: Category[]
  /** Los textos del inicio. */
  content: HomeContent
  /** Las reseñas destacadas. */
  reviews: FeaturedReview[]
  /** Los ajustes públicos de la tienda. */
  settings: PublicSettings
}

/** Lee el catálogo de la base simulada de fábrica (sin demora), igual que lo haría la tienda. */
export async function loadFixtureCatalog(): Promise<FixtureCatalog> {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const api = createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch })
  const [products, categories, content, reviews, settings] = await Promise.all([
    listAllProducts(api),
    listCategories(api),
    getHomeContent(api),
    listFeaturedReviews(api),
    getPublicSettings(api),
  ])
  return { products, categories, content, reviews, settings }
}

/** Copia de un producto con los campos que se cambian, para armar casos (sin stock, sin foto…). */
export function withProduct(
  products: readonly ProductSummary[],
  slug: string,
  changes: Partial<ProductSummary>,
): ProductSummary[] {
  return products.map((product) => (product.slug === slug ? { ...product, ...changes } : product))
}
