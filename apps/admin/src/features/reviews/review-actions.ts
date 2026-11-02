import type { AdminReview, AdminReviewUpdate } from '@galpon/api-client'
import type { ButtonVariant } from '../../components/ui/button-class'
import { REVIEWS_COPY } from './reviews.copy'

/** Lo que se puede hacer con una reseña desde su tarjeta. */
export type ReviewAction = 'approve' | 'hide' | 'feature' | 'unfeature' | 'restore'

/** Cómo es y qué hace una {@link ReviewAction}. */
export interface ReviewActionDefinition {
  /** Texto del botón. */
  label: string
  /** Aviso de éxito. */
  toast: string
  /** Variante del botón: la principal va en cobre. */
  variant: ButtonVariant
  /** Cambio que se manda a `PATCH /admin/reviews/{id}`. */
  update: AdminReviewUpdate
}

/** Cada acción de moderación, con su botón, su aviso y el cambio que manda. */
export const REVIEW_ACTIONS: Readonly<Record<ReviewAction, ReviewActionDefinition>> = {
  approve: {
    label: REVIEWS_COPY.actions.approve,
    toast: REVIEWS_COPY.toasts.approve,
    variant: 'primary',
    update: { status: 'approved' },
  },
  hide: {
    label: REVIEWS_COPY.actions.hide,
    toast: REVIEWS_COPY.toasts.hide,
    variant: 'secondary',
    update: { status: 'hidden' },
  },
  feature: {
    label: REVIEWS_COPY.actions.feature,
    toast: REVIEWS_COPY.toasts.feature,
    variant: 'secondary',
    update: { featured: true },
  },
  unfeature: {
    label: REVIEWS_COPY.actions.unfeature,
    toast: REVIEWS_COPY.toasts.unfeature,
    variant: 'secondary',
    update: { featured: false },
  },
  restore: {
    label: REVIEWS_COPY.actions.restore,
    toast: REVIEWS_COPY.toasts.restore,
    variant: 'secondary',
    update: { status: 'pending' },
  },
}

/** Lo que miran las reglas de moderación de una reseña. */
export type ModeratedReview = Pick<AdminReview, 'status' | 'featured'>

/**
 * Acciones que ofrece la tarjeta de una reseña, en orden: pendiente → aprobar u ocultar;
 * aprobada → destacar o quitar de destacadas, y ocultar; oculta → aprobar o volver a pendientes.
 * Destacar solo se ofrece en las aprobadas, que son las que aparecen en el inicio.
 *
 * @param review - Estado y si es destacada.
 * @returns Las acciones disponibles.
 * @throws {RangeError} Si el estado no es `pending`, `approved` ni `hidden`.
 */
export function availableReviewActions(review: ModeratedReview): readonly ReviewAction[] {
  switch (review.status) {
    case 'pending':
      return ['approve', 'hide']
    case 'approved':
      return [review.featured ? 'unfeature' : 'feature', 'hide']
    case 'hidden':
      return ['approve', 'restore']
    default:
      throw new RangeError(
        `El estado de la reseña tiene que ser pending, approved o hidden; se recibió "${String(review.status)}".`,
      )
  }
}

/**
 * Cómo queda una reseña después de una acción (para la actualización optimista).
 *
 * @param review - La reseña antes del cambio.
 * @param action - La acción elegida.
 * @returns La reseña con el estado y el destacado nuevos.
 */
export function reviewAfter<T extends ModeratedReview>(review: T, action: ReviewAction): T {
  return { ...review, ...REVIEW_ACTIONS[action].update }
}
