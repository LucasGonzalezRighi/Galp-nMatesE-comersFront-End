/**
 * Reseñas de un producto (spec 9.5): resumen con promedio y distribución, listado y formulario
 * para escribir una reseña, que queda pendiente de aprobación.
 *
 * La ficha del producto usa `ReviewsSection` (con la página de reseñas que lee en el servidor) y
 * `formatReviewCount` para el contador de la cabecera.
 *
 * @packageDocumentation
 */
export type { ReviewFormProps } from './ReviewForm'
export type { ReviewListProps } from './ReviewList'
export type { ReviewsSectionProps } from './ReviewsSection'
export type { ReviewSummaryProps } from './ReviewSummary'
export { ReviewForm } from './ReviewForm'
export { ReviewList } from './ReviewList'
export { ReviewsSection } from './ReviewsSection'
export { ReviewSummary } from './ReviewSummary'
export { formatReviewCount } from './reviews-format'
