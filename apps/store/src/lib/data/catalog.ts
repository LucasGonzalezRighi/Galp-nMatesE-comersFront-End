import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Category, ProductSummary } from '@galpon/api-client'
import { listAllProducts, listCategories } from '@galpon/api-client'
import { getServerApi } from '../api.server'

/**
 * Líneas de producto, en el orden del listado. Cacheada por horas y con la etiqueta
 * `categories`, que el backend regenera con `POST /api/revalidate`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getCategories(): Promise<Category[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('categories')
  return await listCategories(getServerApi())
}

/**
 * Catálogo publicado completo (todas las páginas de `GET /products`), en el orden del listado.
 * Es la única lectura cacheada de los productos: la reutilizan el inicio, el catálogo, las fichas
 * (`generateStaticParams` y el sitemap) y "Armá tu kit". Cacheada por horas y con la etiqueta
 * `products`, que el backend regenera con `POST /api/revalidate` al cambiar precios o stock.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getPublishedProducts(): Promise<ProductSummary[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  return await listAllProducts(getServerApi())
}
