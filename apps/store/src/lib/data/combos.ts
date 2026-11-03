import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Combo } from '@galpon/api-client'
import { listCombos } from '@galpon/api-client'
import { getServerApi } from '../api.server'

/**
 * Combos a la venta (`GET /combos`), por posición. Cacheada por horas y con las etiquetas `combos`
 * (el dashboard los guarda) y `products` (el precio y el stock de las piezas cambian la suma, el
 * ahorro y si se pueden comprar), que el backend regenera con `POST /api/revalidate`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getCombos(): Promise<Combo[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('combos', 'products')
  return await listCombos(getServerApi())
}
