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

/** Documentos legales que publica la tienda. */
const LEGAL_DOCUMENTS: readonly string[] = ['terms', 'privacy']

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
 * @param document - `terms` (términos y condiciones) o `privacy` (política de privacidad).
 * @throws {RangeError} Si `document` no es ninguno de los dos.
 * @throws {ApiError} Si la llamada falla.
 */
export async function getLegalContent(
  api: ApiClient,
  document: 'terms' | 'privacy',
): Promise<LegalContent> {
  if (!LEGAL_DOCUMENTS.includes(document)) {
    throw new RangeError(
      `El documento legal tiene que ser "terms" o "privacy", y recibió ${JSON.stringify(document)}`,
    )
  }
  return unwrap(api.GET('/content/legal/{document}', { params: { path: { document } } }))
}
