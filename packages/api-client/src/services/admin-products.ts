import type { ApiClient } from '../client'
import type { AdminProductPage, operations } from '../generated/schema'
import { unwrap } from '../unwrap'

/** Parámetros de búsqueda de `GET /admin/products`: línea, texto, estado, stock, orden y página. */
export type AdminProductQuery = NonNullable<operations['listAdminProducts']['parameters']['query']>

/**
 * Lista una página de productos del dashboard, en cualquier estado.
 *
 * @param api - Cliente de la API.
 * @param query - Filtros, orden y página; sin ellos, la primera página ordenada por código.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function listAdminProducts(
  api: ApiClient,
  query?: AdminProductQuery,
): Promise<AdminProductPage> {
  return unwrap(api.GET('/admin/products', { params: { query } }))
}
