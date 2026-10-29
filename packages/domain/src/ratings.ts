/** Estrellas enteras, de 1 a 5: las filas de la distribución y las opciones del formulario. */
export type StarValue = 1 | 2 | 3 | 4 | 5

/** Fila de la distribución de reseñas: cuántas hay con cierta puntuación. */
export interface RatingBucket {
  /** Puntuación de esta fila, de 1 a 5 estrellas. */
  stars: StarValue
  /** Cantidad de reseñas con esa puntuación. */
  count: number
  /** Porcentaje del total de reseñas, redondeado a entero (0 si no hay reseñas). */
  percent: number
}

/** Palabra que acompaña cada puntuación en el formulario de reseñas, de 1 a 5 estrellas. */
export const STAR_WORDS = ['Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'] as const

/** Puntuaciones posibles, de la más alta a la más baja: el orden en que se listan las barras. */
const STARS_DESCENDING = [5, 4, 3, 2, 1] as const satisfies readonly StarValue[]

/** Un decimal con coma como separador decimal. */
const RATING_FORMAT = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Indica si una puntuación de reseña es válida: de 1 a 5 estrellas, en pasos de media estrella.
 *
 * @param rating - Puntuación a comprobar.
 * @returns `true` si es un múltiplo de 0,5 de 1 a 5 (4,5 sí; 4,3, 0,5 y 5,5 no).
 * @example
 * isValidRating(4.5) // true
 * isValidRating(4.3) // false
 */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating * 2) && rating >= 1 && rating <= 5
}

/** Valida que cada puntuación sea un múltiplo de 0,5 de 1 a 5. */
function assertValidRatings(ratings: readonly number[]): void {
  for (const rating of ratings) {
    if (!isValidRating(rating)) {
      throw new RangeError(
        `La puntuación tiene que ser un múltiplo de 0,5 de 1 a 5; se recibió ${String(rating)}.`,
      )
    }
  }
}

/**
 * Calcula el promedio de las puntuaciones de un producto.
 *
 * @param ratings - Puntuaciones de las reseñas aprobadas (admiten medias estrellas); puede estar vacía.
 * @returns El promedio simple, sin redondear (0 si no hay reseñas).
 * @throws {RangeError} Si alguna puntuación no es un múltiplo de 0,5 de 1 a 5.
 * @example
 * averageRating([5, 5, 4]) // 4.666…
 */
export function averageRating(ratings: readonly number[]): number {
  assertValidRatings(ratings)
  if (ratings.length === 0) return 0
  return ratings.reduce((total, rating) => total + rating, 0) / ratings.length
}

/**
 * Formatea un promedio con un decimal y coma, como en "4,7".
 *
 * Con cero reseñas el promedio es 0 y se muestra "0,0": quien dibuja la ficha decide si en
 * ese caso muestra otra cosa (el diseño pone un guion largo).
 *
 * @param average - Promedio de 0 a 5.
 * @returns El promedio redondeado a un decimal.
 * @throws {RangeError} Si el promedio no es un número entre 0 y 5.
 * @example
 * formatRating(averageRating([5, 5, 4])) // "4,7"
 */
export function formatRating(average: number): string {
  if (!Number.isFinite(average) || average < 0 || average > 5) {
    throw new RangeError(
      `El promedio tiene que ser un número entre 0 y 5; se recibió ${String(average)}.`,
    )
  }
  return RATING_FORMAT.format(average)
}

/**
 * Arma la distribución de reseñas para las barras de la ficha.
 *
 * Los porcentajes se redondean de a uno, así que pueden no sumar exactamente 100. Una media
 * estrella cuenta en la fila de su parte entera (4,5 en la de 4), así toda reseña está en una fila.
 *
 * @param ratings - Puntuaciones de las reseñas aprobadas; puede estar vacía.
 * @returns Cinco filas, de 5 a 1 estrellas, con cantidad y porcentaje.
 * @throws {RangeError} Si alguna puntuación no es un múltiplo de 0,5 de 1 a 5.
 * @example
 * ratingDistribution([5, 5, 4])[0] // { stars: 5, count: 2, percent: 67 }
 */
export function ratingDistribution(ratings: readonly number[]): readonly RatingBucket[] {
  assertValidRatings(ratings)
  return STARS_DESCENDING.map((stars) => {
    const count = ratings.filter((rating) => Math.floor(rating) === stars).length
    return {
      stars,
      count,
      percent: ratings.length === 0 ? 0 : Math.round((count / ratings.length) * 100),
    }
  })
}

/**
 * Arma "cantidad + palabra" con el singular solo cuando la cantidad es 1.
 *
 * @param count - Cantidad, un entero mayor o igual a 0.
 * @param singular - Palabra en singular ("reseña").
 * @param plural - Palabra en plural ("reseñas").
 * @returns La cantidad seguida de la palabra que corresponde.
 * @throws {RangeError} Si la cantidad no es un entero mayor o igual a 0.
 * @example
 * pluralize(1, 'reseña', 'reseñas') // "1 reseña"
 * pluralize(0, 'reseña', 'reseñas') // "0 reseñas"
 */
export function pluralize(count: number, singular: string, plural: string): string {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `La cantidad tiene que ser un entero mayor o igual a 0; se recibió ${String(count)}.`,
    )
  }
  return `${String(count)} ${count === 1 ? singular : plural}`
}
