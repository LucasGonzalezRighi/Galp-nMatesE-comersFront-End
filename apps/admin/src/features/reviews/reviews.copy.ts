import type { ReviewsTab } from './reviews-search'

/** Textos de la pantalla de reseñas. */
export const REVIEWS_COPY = {
  title: 'Reseñas',
  description:
    'Solo las aprobadas se ven en la ficha y cuentan en el promedio. Las destacadas aprobadas aparecen en el inicio.',
  /** Nombre accesible de la lista de pestañas. */
  tabsLabel: 'Estado de las reseñas',
  tabs: {
    pendientes: 'Pendientes',
    aprobadas: 'Aprobadas',
    ocultas: 'Ocultas',
  } satisfies Record<ReviewsTab, string>,
  /** Lista de reseñas mientras carga (se anuncia con `aria-busy`). */
  listLabel: 'Reseñas',
  verifiedPurchase: 'Compra verificada',
  featured: 'Destacada',
  /** Aviso oculto del enlace a la ficha. */
  opensInNewTab: '(se abre en una pestaña nueva)',
  actions: {
    approve: 'Aprobar',
    hide: 'Ocultar',
    feature: 'Destacar en el inicio',
    unfeature: 'Quitar de destacadas',
    restore: 'Volver a pendientes',
  },
  toasts: {
    approve: 'Reseña aprobada.',
    hide: 'Reseña oculta.',
    feature: 'Reseña destacada en el inicio.',
    unfeature: 'Reseña quitada de destacadas.',
    restore: 'La reseña volvió a pendientes.',
  },
  empty: {
    pendientes: 'No hay reseñas para moderar.',
    aprobadas: 'Todavía no hay reseñas aprobadas.',
    ocultas: 'No hay reseñas ocultas.',
  } satisfies Record<ReviewsTab, string>,
  /** Atajo del vacío de cada pestaña a otra. */
  emptyAction: {
    pendientes: { label: 'Ver aprobadas', tab: 'aprobadas' },
    aprobadas: { label: 'Ver pendientes', tab: 'pendientes' },
    ocultas: { label: 'Ver pendientes', tab: 'pendientes' },
  } satisfies Record<ReviewsTab, { label: string; tab: ReviewsTab }>,
  /** Acción del vacío de una página que ya no tiene reseñas. */
  firstPage: 'Ir a la primera página',
  loadError: 'No pudimos cargar las reseñas.',
  /** Aviso cuando un cambio falla sin un mensaje de la API. */
  saveError: 'No pudimos guardar el cambio. Probá de nuevo.',
} as const

/**
 * Texto oculto que acompaña a las estrellas de una reseña.
 *
 * @param rating - Puntuación, un entero de 1 a 5.
 * @returns Por ejemplo "4 de 5 estrellas".
 * @throws {RangeError} Si `rating` no es un entero de 1 a 5.
 * @example
 * ratingLabel(4) // "4 de 5 estrellas"
 */
export function ratingLabel(rating: number): string {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RangeError(
      `La puntuación tiene que ser un entero de 1 a 5; se recibió ${String(rating)}.`,
    )
  }
  return `${String(rating)} de 5 estrellas`
}
