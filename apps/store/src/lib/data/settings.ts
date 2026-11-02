import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { PublicSettings } from '@galpon/api-client'
import { getPublicSettings as fetchPublicSettings } from '@galpon/api-client'
import { getServerApi } from '../api.server'

/**
 * Ajustes públicos de la tienda (contacto, envíos, vendedor, descuento del kit). Cacheada por
 * horas y con la etiqueta `settings`, que el backend regenera con `POST /api/revalidate`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getPublicSettings(): Promise<PublicSettings> {
  'use cache'
  cacheLife('hours')
  cacheTag('settings')
  return await fetchPublicSettings(getServerApi())
}
