import 'server-only'
import type { ProductSummary } from '@galpon/api-client'
import { getPublishedProducts } from '../../lib/data/catalog'

/**
 * Catálogo publicado completo (todas las páginas de `GET /products`), en el orden del listado.
 * Sale de la lectura cacheada compartida (`getPublishedProducts`, etiqueta `products`). La usa el
 * catálogo (`/tienda`), que filtra y ordena en el navegador.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getCatalogProducts(): Promise<ProductSummary[]> {
  return await getPublishedProducts()
}
