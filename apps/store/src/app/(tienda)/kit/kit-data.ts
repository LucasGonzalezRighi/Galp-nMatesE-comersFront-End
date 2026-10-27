import 'server-only'
import type { KitProduct } from '@/features/kit'
import { kitProductsFrom } from '@/features/kit'
import { getPublishedProducts } from '@/lib/data/catalog'

/**
 * Productos que ofrece "Armá tu kit": los publicados que se pueden comprar (mates, bombillas y
 * yerbas), reducidos a lo que usa el asistente. Salen de la lectura cacheada compartida
 * (`getPublishedProducts`, etiqueta `products`), que el backend regenera con `POST /api/revalidate`
 * al cambiar precios o stock.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getKitProducts(): Promise<KitProduct[]> {
  return kitProductsFrom(await getPublishedProducts())
}
