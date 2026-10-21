import type { ApiClient } from '../client'
import type {
  Category,
  ProductDetail,
  ProductPage,
  ProductSummary,
  operations,
} from '../generated/schema'
import { unwrap } from '../unwrap'
import { assertSlug } from './validation'

/** Parámetros de búsqueda de `GET /products`: línea, grupo, texto, orden, ids, destacados y página. */
export type ProductQuery = NonNullable<operations['listProducts']['parameters']['query']>

/** Cantidad de productos por página que pide {@link listAllProducts} (el máximo del contrato). */
const MAX_PAGE_SIZE = 100

/**
 * Lista las líneas de producto.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function listCategories(api: ApiClient): Promise<Category[]> {
  return unwrap(api.GET('/categories'))
}

/**
 * Lista una página de productos publicados.
 *
 * @param api - Cliente de la API.
 * @param query - Filtros, orden y página; sin ellos, la primera página con el orden por defecto.
 * @throws {ApiError} Si la llamada falla (`validation` si algún parámetro es inválido).
 */
export function listProducts(api: ApiClient, query?: ProductQuery): Promise<ProductPage> {
  return unwrap(api.GET('/products', { params: { query } }))
}

/**
 * Lista todos los productos que cumplen los filtros, recorriendo las páginas de 100.
 *
 * Pide las páginas de a una y se detiene al juntar el `total` que informa el servidor o cuando
 * una página llega vacía.
 *
 * @param api - Cliente de la API.
 * @param query - Filtros y orden; la paginación la maneja esta función.
 * @throws {ApiError} Si falla alguna de las páginas.
 */
export async function listAllProducts(
  api: ApiClient,
  query: Omit<ProductQuery, 'page' | 'pageSize'> = {},
): Promise<ProductSummary[]> {
  const products: ProductSummary[] = []
  for (let page = 1; ; page += 1) {
    const result = await listProducts(api, { ...query, page, pageSize: MAX_PAGE_SIZE })
    products.push(...result.items)
    if (result.items.length === 0 || products.length >= result.total) return products
  }
}

/**
 * Trae la ficha de un producto. Con un slug anterior responde igual, con el slug actual.
 *
 * @param api - Cliente de la API.
 * @param slug - Slug del producto.
 * @throws {RangeError} Si el slug está vacío o no cumple el patrón del contrato (ver `assertSlug`).
 * @throws {ApiError} Si la llamada falla (`not_found` si no existe).
 */
export async function getProduct(api: ApiClient, slug: string): Promise<ProductDetail> {
  assertSlug(slug)
  return unwrap(api.GET('/products/{slug}', { params: { path: { slug } } }))
}

/**
 * Lista los productos relacionados con uno (puede estar vacía).
 *
 * @param api - Cliente de la API.
 * @param slug - Slug del producto.
 * @throws {RangeError} Si el slug está vacío o no cumple el patrón del contrato (ver `assertSlug`).
 * @throws {ApiError} Si la llamada falla (`not_found` si el producto no existe).
 */
export async function listRelatedProducts(api: ApiClient, slug: string): Promise<ProductSummary[]> {
  assertSlug(slug)
  return unwrap(api.GET('/products/{slug}/related', { params: { path: { slug } } }))
}
