import type { LegalDocument } from '@galpon/domain'
import { isLegalDocument, LEGAL_DOCUMENTS } from '@galpon/domain'
import type { ApiClient } from '../client'
import type {
  AboutContent,
  FaqContent,
  FooterContent,
  HomeContent,
  LegalContent,
  ProductTabsContent,
} from '../generated/schema'
import { unwrap } from '../unwrap'

/**
 * Trae los textos del inicio.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function getHomeContent(api: ApiClient): Promise<HomeContent> {
  return unwrap(api.GET('/content/home'))
}

/**
 * Trae los textos de Nosotros.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function getAboutContent(api: ApiClient): Promise<AboutContent> {
  return unwrap(api.GET('/content/about'))
}

/**
 * Trae los textos de las preguntas frecuentes.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function getFaqContent(api: ApiClient): Promise<FaqContent> {
  return unwrap(api.GET('/content/faq'))
}

/**
 * Trae los textos del pie de página.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function getFooterContent(api: ApiClient): Promise<FooterContent> {
  return unwrap(api.GET('/content/footer'))
}

/**
 * Trae los textos de las pestañas de la ficha de producto.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function getProductTabsContent(api: ApiClient): Promise<ProductTabsContent> {
  return unwrap(api.GET('/content/product-tabs'))
}

/**
 * Trae un documento legal.
 *
 * @param api - Cliente de la API.
 * @param document - Uno de `LEGAL_DOCUMENTS` de `@galpon/domain`: `terms`, `privacy`, `cookies`
 *   o `returns`.
 * @throws {RangeError} Si `document` no es ninguno de ellos.
 * @throws {ApiError} Si la llamada falla.
 */
export async function getLegalContent(
  api: ApiClient,
  document: LegalDocument,
): Promise<LegalContent> {
  if (!isLegalDocument(document)) {
    throw new RangeError(
      `El documento legal tiene que ser ${LEGAL_DOCUMENTS.map((d) => `"${d}"`).join(', ')}; se recibió ${JSON.stringify(document)}.`,
    )
  }
  return unwrap(api.GET('/content/legal/{document}', { params: { path: { document } } }))
}
