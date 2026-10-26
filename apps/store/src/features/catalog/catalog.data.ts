import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { ProductSummary } from '@galpon/api-client'
import { listAllProducts } from '@galpon/api-client'
import { getServerApi } from '../../lib/api.server'

/**
 * Catálogo publicado completo (todas las páginas de `GET /products`), en el orden del listado.
 * Cacheada por horas y con la etiqueta `products`, que el backend regenera con
 * `POST /api/revalidate`. La usa el catálogo (`/tienda`), que filtra y ordena en el navegador.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getCatalogProducts(): Promise<ProductSummary[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  return await listAllProducts(getServerApi())
}
