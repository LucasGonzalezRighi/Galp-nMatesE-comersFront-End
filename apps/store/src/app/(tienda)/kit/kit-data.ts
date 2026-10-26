import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { KitProduct } from '@/features/kit'
import { kitProductsFrom } from '@/features/kit'
import { getServerApi } from '@/lib/api.server'
import { listAllProducts } from '@galpon/api-client'

/**
 * Productos que ofrece "Armá tu kit": los publicados que se pueden comprar (mates, bombillas y
 * yerbas), reducidos a lo que usa el asistente. Cacheada por horas y con la etiqueta `products`,
 * que el backend regenera con `POST /api/revalidate` al cambiar precios o stock.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getKitProducts(): Promise<KitProduct[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  return kitProductsFrom(await listAllProducts(getServerApi()))
}
