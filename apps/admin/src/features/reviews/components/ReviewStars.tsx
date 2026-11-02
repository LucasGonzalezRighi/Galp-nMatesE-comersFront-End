import type { ReactNode } from 'react'
import { StarHalfIcon, StarIcon } from '@phosphor-icons/react'
import { ratingLabel } from '../reviews.copy'

/** Props de {@link ReviewStars}. */
export interface ReviewStarsProps {
  /** Puntuación, un múltiplo de 0,5 de 1 a 5 (admite media estrella, como 4,5). */
  rating: number
}

/** Posiciones de las cinco estrellas. */
const POSITIONS = [1, 2, 3, 4, 5] as const

/** Cómo se dibuja una estrella: llena, a la mitad o vacía. */
type StarFill = 'full' | 'half' | 'empty'

/** La estrella de esa posición se llena hasta la puntuación y queda a la mitad en la media. */
function starFill(rating: number, position: number): StarFill {
  if (position <= rating) return 'full'
  if (position - 0.5 <= rating) return 'half'
  return 'empty'
}

/**
 * Cinco estrellas, llenas (cobre) hasta la puntuación, una media estrella si la puntuación termina
 * en ,5 y vacías después, con el texto oculto "{n} de 5 estrellas" (por ejemplo "4,5 de 5
 * estrellas").
 *
 * @param props - Ver {@link ReviewStarsProps}.
 * @throws {RangeError} Si `rating` no es un múltiplo de 0,5 de 1 a 5.
 */
export function ReviewStars({ rating }: ReviewStarsProps): ReactNode {
  const label = ratingLabel(rating)
  return (
    <span className="inline-flex items-center gap-0.5">
      {POSITIONS.map((position) => {
        const fill = starFill(rating, position)
        const Icon = fill === 'half' ? StarHalfIcon : StarIcon
        return (
          <Icon
            key={position}
            size={18}
            weight={fill === 'empty' ? 'regular' : 'fill'}
            aria-hidden="true"
            data-fill={fill}
            className={fill === 'empty' ? 'text-neutral-600' : 'text-accent'}
          />
        )
      })}
      <span className="sr-only">{label}</span>
    </span>
  )
}
