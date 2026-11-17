/**
 * Páginas legales (términos y condiciones, privacidad, cookies y devoluciones): `LegalRoute` y
 * `buildLegalMetadata` arman cada ruta en el servidor, `LegalPage` dibuja el documento con los
 * datos del vendedor (LA-1 y LA-2), `parseLegalBody` interpreta el texto y `LEGAL_PAGES` da la
 * ruta y la descripción de cada documento.
 *
 * @packageDocumentation
 */
export type { LegalPageInfo, LegalPath } from './legal-pages'
export { LEGAL_PAGES } from './legal-pages'
export type { LegalRouteProps } from './legal-route'
export { buildLegalMetadata, LegalRoute } from './legal-route'
export type { LegalBlock, LegalInline } from './legal-text'
export { parseLegalBody } from './legal-text'
export { getLegalContent } from './get-legal-content'
export type { LegalPageProps } from './LegalPage'
export { LegalPage } from './LegalPage'
