import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Category } from '@galpon/api-client'
import { listCategories } from '@galpon/api-client'
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
