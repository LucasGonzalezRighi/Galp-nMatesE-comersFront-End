import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { LegalContent } from '@galpon/api-client'
import type { LegalDocument } from '@galpon/domain'
import { getServerApi } from '@/lib/api.server'
import { getLegalContent as fetchLegalContent } from '@galpon/api-client'

/**
 * Documento legal (`terms`, `privacy`, `cookies` o `returns`). Cacheada por horas y con las
 * etiquetas `content:legal` y `content:legal-{document}`, que el backend regenera con
 * `POST /api/revalidate`.
 *
 * @param document - El documento (ver `LEGAL_DOCUMENTS` de `@galpon/domain`).
 * @throws {RangeError} Si `document` no es ninguno de los cuatro.
 * @throws {ApiError} Si la API falla.
 */
export async function getLegalContent(document: LegalDocument): Promise<LegalContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('content:legal', `content:legal-${document}`)
  return await fetchLegalContent(getServerApi(), document)
}
