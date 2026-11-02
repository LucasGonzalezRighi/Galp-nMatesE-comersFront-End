import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { AboutContent } from '@galpon/api-client'
import { getServerApi } from '@/lib/api.server'
import { getAboutContent as fetchAboutContent } from '@galpon/api-client'

/**
 * Textos de la página Nosotros. Cacheada por horas y con la etiqueta `content:about`, que el
 * backend regenera con `POST /api/revalidate`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getAboutContent(): Promise<AboutContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('content:about')
  return await fetchAboutContent(getServerApi())
}
