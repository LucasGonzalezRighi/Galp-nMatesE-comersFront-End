/**
 * Preguntas frecuentes (spec 9.5): `FaqPage` con las categorías y el acordeón, y `getFaqContent`
 * para leerlas en el servidor (cacheado con la etiqueta `content:faq`). El ancla `#envios` (o la
 * de cualquier categoría) abre esa categoría.
 *
 * @packageDocumentation
 */
export type { FaqPageProps } from './FaqPage'
export { faqCategoryFromHash } from './faq-hash'
export { FaqPage } from './FaqPage'
export { getFaqContent } from './get-faq-content'
