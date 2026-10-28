import type { ReactNode } from 'react'
import { StarIcon } from '@phosphor-icons/react'
import { ratingLabel } from '../reviews.copy'

/** Props de {@link ReviewStars}. */
export interface ReviewStarsProps {
  /** Puntuación, un entero de 1 a 5. */
  rating: number
}

/** Posiciones de las cinco estrellas. */
const POSITIONS = [1, 2, 3, 4, 5] as const

/**
 * Cinco estrellas, llenas (cobre) hasta la puntuación y vacías después, con el texto oculto
 * "{n} de 5 estrellas".
 *
 * @param props - Ver {@link ReviewStarsProps}.
 * @throws {RangeError} Si `rating` no es un entero de 1 a 5.
 */
export function ReviewStars({ rating }: ReviewStarsProps): ReactNode {
  const label = ratingLabel(rating)
  return (
    <span className="inline-flex items-center gap-0.5">
      {POSITIONS.map((position) => (
        <StarIcon
          key={position}
          size={18}
          weight={position <= rating ? 'fill' : 'regular'}
          aria-hidden="true"
          className={position <= rating ? 'text-accent' : 'text-neutral-600'}
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  )
}
