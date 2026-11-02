import type { ApiClient } from '../client'
import type {
  AboutContent,
  AboutContentInput,
  AdminSettings,
  FaqContent,
  FooterContent,
  HomeContent,
  LegalContent,
  ProductTabsContent,
  operations,
} from '../generated/schema'
import { unwrap } from '../unwrap'

/** Documento legal del dashboard: `terms` (términos y condiciones) o `privacy` (privacidad). */
export type LegalDocument = operations['getAdminLegalContent']['parameters']['path']['document']

/** Páginas de contenido editables del dashboard y lo que devuelve cada una. */
export interface AdminContentByPage {
  /** Textos del inicio. */
  home: HomeContent
  /** Textos de Nosotros. */
  about: AboutContent
  /** Preguntas frecuentes. */
  faq: FaqContent
  /** Pie de página. */
  footer: FooterContent
  /** Textos de las pestañas de la ficha de producto. */
  'product-tabs': ProductTabsContent
}

/** Página de contenido del dashboard, como va en la ruta (`/admin/content/{página}`). */
export type AdminContentPage = keyof AdminContentByPage

/** Páginas de contenido, en el orden del menú del dashboard. */
export const ADMIN_CONTENT_PAGES = [
  'home',
  'about',
  'faq',
  'footer',
  'product-tabs',
] as const satisfies readonly AdminContentPage[]

/** Documentos legales. */
const LEGAL_DOCUMENTS: readonly string[] = ['terms', 'privacy']

/**
 * Comprueba que el documento legal sea `terms` o `privacy`.
 *
 * @throws {RangeError} Si es otro.
 */
function assertLegalDocument(document: LegalDocument): void {
  if (!LEGAL_DOCUMENTS.includes(document)) {
    throw new RangeError(
      `El documento legal tiene que ser "terms" o "privacy", y recibió ${JSON.stringify(document)}`,
    )
  }
}

/**
 * Trae los textos del inicio como los guarda el dashboard.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getAdminHomeContent(api: ApiClient): Promise<HomeContent> {
  return unwrap(api.GET('/admin/content/home'))
}

/**
 * Guarda los textos del inicio (la página entera).
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Textos completos del inicio.
 * @returns Lo guardado, ya normalizado.
 * @throws {ApiError} Con `validation` por campo, `unauthorized` sin sesión y `forbidden`
 *   (`csrf_invalid`) sin el token CSRF.
 */
export function updateAdminHomeContent(api: ApiClient, input: HomeContent): Promise<HomeContent> {
  return unwrap(api.PUT('/admin/content/home', { body: input }))
}

/**
 * Trae los textos de Nosotros, con las fotos de los socios.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getAdminAboutContent(api: ApiClient): Promise<AboutContent> {
  return unwrap(api.GET('/admin/content/about'))
}

/**
 * Guarda los textos de Nosotros; las fotos de los socios van como `ImageInput` (ya subidas).
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Textos completos de Nosotros.
 * @returns Lo guardado, con la `url` de cada foto.
 * @throws {ApiError} Con `validation` por campo (`partners.N.photo.publicId` si una foto no
 *   existe), `unauthorized` sin sesión y `forbidden` (`csrf_invalid`) sin el token CSRF.
 */
export function updateAdminAboutContent(
  api: ApiClient,
  input: AboutContentInput,
): Promise<AboutContent> {
  return unwrap(api.PUT('/admin/content/about', { body: input }))
}

/**
 * Trae las preguntas frecuentes.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getAdminFaqContent(api: ApiClient): Promise<FaqContent> {
  return unwrap(api.GET('/admin/content/faq'))
}

/**
 * Guarda las preguntas frecuentes (todas las categorías).
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Preguntas completas.
 * @returns Lo guardado, ya normalizado.
 * @throws {ApiError} Con `validation` por campo, `unauthorized` y `forbidden` (`csrf_invalid`).
 */
export function updateAdminFaqContent(api: ApiClient, input: FaqContent): Promise<FaqContent> {
  return unwrap(api.PUT('/admin/content/faq', { body: input }))
}

/**
 * Trae los textos del pie de página.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getAdminFooterContent(api: ApiClient): Promise<FooterContent> {
  return unwrap(api.GET('/admin/content/footer'))
}

/**
 * Guarda los textos del pie de página.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Pie completo; un enlace a Defensa del Consumidor vacío queda en `null`.
 * @returns Lo guardado, ya normalizado.
 * @throws {ApiError} Con `validation` por campo, `unauthorized` y `forbidden` (`csrf_invalid`).
 */
export function updateAdminFooterContent(
  api: ApiClient,
  input: FooterContent,
): Promise<FooterContent> {
  return unwrap(api.PUT('/admin/content/footer', { body: input }))
}

/**
 * Trae los textos de fábrica de las pestañas de la ficha de producto.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getAdminProductTabsContent(api: ApiClient): Promise<ProductTabsContent> {
  return unwrap(api.GET('/admin/content/product-tabs'))
}

/**
 * Guarda los textos de fábrica de las pestañas de la ficha de producto.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Textos completos de los tres grupos y el de envío.
 * @returns Lo guardado, ya normalizado.
 * @throws {ApiError} Con `validation` por campo, `unauthorized` y `forbidden` (`csrf_invalid`).
 */
export function updateAdminProductTabsContent(
  api: ApiClient,
  input: ProductTabsContent,
): Promise<ProductTabsContent> {
  return unwrap(api.PUT('/admin/content/product-tabs', { body: input }))
}

/**
 * Trae un documento legal para editarlo.
 *
 * @param api - Cliente de la API.
 * @param document - `terms` o `privacy`.
 * @throws {RangeError} Si `document` no es ninguno de los dos.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getAdminLegalContent(
  api: ApiClient,
  document: LegalDocument,
): Promise<LegalContent> {
  assertLegalDocument(document)
  return unwrap(api.GET('/admin/content/legal/{document}', { params: { path: { document } } }))
}

/**
 * Guarda un documento legal entero.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param document - `terms` o `privacy`.
 * @param input - Título, fecha de actualización (`AAAA-MM-DD`) y cuerpo.
 * @returns Lo guardado, ya normalizado.
 * @throws {RangeError} Si `document` no es ninguno de los dos.
 * @throws {ApiError} Con `validation` por campo, `unauthorized` y `forbidden` (`csrf_invalid`).
 */
export function updateAdminLegalContent(
  api: ApiClient,
  document: LegalDocument,
  input: LegalContent,
): Promise<LegalContent> {
  assertLegalDocument(document)
  return unwrap(
    api.PUT('/admin/content/legal/{document}', { params: { path: { document } }, body: input }),
  )
}

/**
 * Trae los ajustes del dashboard: los públicos más el umbral de poco stock y el IVA.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getAdminSettings(api: ApiClient): Promise<AdminSettings> {
  return unwrap(api.GET('/admin/settings'))
}

/**
 * Guarda los ajustes (todos). Tienen que venir las tres opciones de envío; el nombre de cada una
 * (`label`) no se edita: el back conserva el que tenía.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Ajustes completos.
 * @returns Lo guardado, ya normalizado (el CUIT sin guiones).
 * @throws {ApiError} Con `validation` por campo (`shippingOptions` si no están los tres envíos),
 *   `unauthorized` y `forbidden` (`csrf_invalid`).
 */
export function updateAdminSettings(api: ApiClient, input: AdminSettings): Promise<AdminSettings> {
  return unwrap(api.PUT('/admin/settings', { body: input }))
}
