import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { LegalContent } from '@galpon/api-client'
import { getServerApi } from '@/lib/api.server'
import { getLegalContent as fetchLegalContent } from '@galpon/api-client'

/**
 * Documento legal (`terms` o `privacy`). Cacheada por horas y con las etiquetas `content:legal` y
 * `content:legal-terms` o `content:legal-privacy`, que el backend regenera con
 * `POST /api/revalidate`.
 *
 * @param document - `terms` (términos y condiciones) o `privacy` (política de privacidad).
 * @throws {RangeError} Si `document` no es ninguno de los dos.
 * @throws {ApiError} Si la API falla.
 */
export async function getLegalContent(document: 'terms' | 'privacy'): Promise<LegalContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('content:legal', `content:legal-${document}`)
  return await fetchLegalContent(getServerApi(), document)
}
