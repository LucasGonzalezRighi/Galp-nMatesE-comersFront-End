import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { FaqContent } from '@galpon/api-client'
import { getServerApi } from '@/lib/api.server'
import { getFaqContent as fetchFaqContent } from '@galpon/api-client'

/**
 * Preguntas frecuentes agrupadas por categoría. Cacheada por horas y con la etiqueta
 * `content:faq`, que el backend regenera con `POST /api/revalidate`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getFaqContent(): Promise<FaqContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('content:faq')
  return await fetchFaqContent(getServerApi())
}
