import { z } from 'zod'
import { honeypotSchema } from './fields'
import { MESSAGES } from './messages'

/** Nombre con el que se publica una reseña cuando la persona no puso el suyo. */
const ANONYMOUS_AUTHOR = 'Anónimo'

/**
 * Formulario de reseña de un producto: puntuación, nombre opcional y texto.
 *
 * - `rating`: de 1 a 5 estrellas, en pasos de media estrella (4,5 vale; 4,3 no).
 * - `authorName`: hasta 40 caracteres; ausente, vacío o solo espacios sale como `"Anónimo"`.
 * - `text`: de 10 a 600 caracteres.
 * - `website`: campo trampa contra bots, tiene que llegar vacío.
 *
 * @example
 * reviewSchema.parse({ rating: 5, authorName: '', text: 'Un mate hermoso.' })
 * // { rating: 5, authorName: 'Anónimo', text: 'Un mate hermoso.' }
 */
export const reviewSchema = z.object({
  rating: z
    .number({ error: MESSAGES.reviewRating })
    .multipleOf(0.5, MESSAGES.reviewRating)
    .min(1, MESSAGES.reviewRating)
    .max(5, MESSAGES.reviewRating),
  authorName: z
    .string()
    .trim()
    .max(40, MESSAGES.max(40))
    .transform((name) => (name === '' ? ANONYMOUS_AUTHOR : name))
    .default(ANONYMOUS_AUTHOR),
  text: z
    .string({ error: MESSAGES.reviewText })
    .trim()
    .min(10, MESSAGES.reviewText)
    .max(600, MESSAGES.max(600)),
  website: honeypotSchema,
})

/** Reseña como la escribe la persona, antes de normalizarla. */
export type ReviewInput = z.input<typeof reviewSchema>

/** Reseña ya normalizada: el nombre siempre está (`"Anónimo"` si no puso uno). */
export type Review = z.output<typeof reviewSchema>
