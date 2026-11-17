import 'server-only'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import type { LegalDocument } from '@galpon/domain'
import { getPublicSettings } from '@/lib/data/settings'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'
import { isLegalDocument, legalMarkerValues } from '@galpon/domain'
import { getLegalContent } from './get-legal-content'
import { LEGAL_PAGES } from './legal-pages'
import { LEGAL_COPY } from './legal.copy'
import { LegalPage } from './LegalPage'

/** Props de {@link LegalRoute}. */
export interface LegalRouteProps {
  /** El documento que dibuja la ruta. */
  document: LegalDocument
}

/** Lanza `RangeError` si `document` no es uno de los cuatro documentos legales. */
function assertDocument(document: string): void {
  if (!isLegalDocument(document)) {
    throw new RangeError(
      `El documento legal tiene que ser "terms", "privacy", "cookies" o "returns"; se recibió ${JSON.stringify(document)}.`,
    )
  }
}

/**
 * Metadatos de una página legal: el título del documento (editable) y la descripción de
 * {@link LEGAL_PAGES}.
 *
 * @param document - El documento.
 * @throws {RangeError} Si `document` no es uno de los cuatro.
 * @throws {ApiError} Si la API falla.
 */
export async function buildLegalMetadata(document: LegalDocument): Promise<Metadata> {
  assertDocument(document)
  const { title } = await getLegalContent(document)
  const { path, description } = LEGAL_PAGES[document]
  return buildPageMetadata({ title, description, path, siteUrl: getStoreEnv().siteUrl })
}

/**
 * Página de un documento legal, en el servidor: lee el documento y los ajustes públicos y dibuja
 * {@link LegalPage} con los datos del vendedor. Un dato que falta se lee "a completar por el
 * vendedor", salvo en producción (`NODE_ENV === 'production'` y `API_MODE=live`), donde queda
 * vacío (LA-2): la tienda compilada en modo de prueba no es producción.
 *
 * @param props - Ver {@link LegalRouteProps}.
 * @throws {RangeError} Si `document` no es uno de los cuatro.
 * @throws {ApiError} Si la API falla.
 */
export async function LegalRoute({ document }: LegalRouteProps): Promise<ReactNode> {
  assertDocument(document)
  const [content, settings] = await Promise.all([getLegalContent(document), getPublicSettings()])
  const production = process.env.NODE_ENV === 'production' && getStoreEnv().apiMode === 'live'
  return (
    <LegalPage
      content={content}
      markers={legalMarkerValues(settings)}
      missingText={production ? '' : LEGAL_COPY.missingData}
    />
  )
}
