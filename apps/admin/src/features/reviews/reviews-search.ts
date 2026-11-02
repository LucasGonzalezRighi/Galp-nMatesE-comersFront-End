import { z } from 'zod'
import type { ReviewStatus } from '@galpon/api-client'

/** Pestaña de la pantalla de reseñas, como va en la URL (`?estado=`). */
export type ReviewsTab = 'pendientes' | 'aprobadas' | 'ocultas'

/** Las pestañas, en el orden en que se muestran. */
export const REVIEWS_TABS = [
  'pendientes',
  'aprobadas',
  'ocultas',
] as const satisfies readonly ReviewsTab[]

/** Estado de moderación (de la API) que muestra cada pestaña. */
export const REVIEWS_TAB_STATUS: Readonly<Record<ReviewsTab, ReviewStatus>> = {
  pendientes: 'pending',
  aprobadas: 'approved',
  ocultas: 'hidden',
}

/** Búsqueda de `/resenas`: la pestaña y la página. */
export interface ReviewsSearch {
  /** Pestaña elegida. */
  estado: ReviewsTab
  /** Página, desde 1. */
  pagina: number
}

/** Valores por omisión de {@link ReviewsSearch}: la ruta los saca de la URL. */
export const REVIEWS_SEARCH_DEFAULTS = {
  estado: 'pendientes',
  pagina: 1,
} as const satisfies ReviewsSearch

/**
 * Valida `?estado=` y `?pagina=` de `/resenas`. Lo que no sirve vuelve al valor por omisión
 * (pendientes, página 1), así una dirección vieja o mal escrita nunca rompe la pantalla.
 */
export const reviewsSearchSchema = z.object({
  estado: z.enum(REVIEWS_TABS).catch(REVIEWS_SEARCH_DEFAULTS.estado),
  pagina: z.coerce.number().int().min(1).catch(REVIEWS_SEARCH_DEFAULTS.pagina),
}) satisfies z.ZodType<ReviewsSearch>
