import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { FooterContent } from '@galpon/api-client'
import { getFooterContent as fetchFooterContent } from '@galpon/api-client'
import { getServerApi } from '../api.server'

/**
 * Textos del pie de página (frase, bajada, medios de pago y link de Defensa del Consumidor).
 * Cacheada por horas y con la etiqueta `content:footer`, que el backend regenera con
 * `POST /api/revalidate`.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getFooterContent(): Promise<FooterContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('content:footer')
  return await fetchFooterContent(getServerApi())
}
