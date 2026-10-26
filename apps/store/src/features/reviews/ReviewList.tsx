import type { CSSProperties, ReactNode } from 'react'
import type { Review } from '@galpon/api-client'
import { formatMonthYear } from '@galpon/domain'
import { Reveal } from '../../components/motion'
import { Stars } from '../../components/ui'
import { REVIEWS_COPY } from './reviews.copy'

/** Props de {@link ReviewList}. */
export interface ReviewListProps {
  /** Reseñas aprobadas a mostrar, de la más nueva a la más vieja (como las entrega la API). */
  reviews: readonly Review[]
}

/** Línea inferior de cada reseña, con los extremos desvanecidos. */
const SEPARATOR_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px',
}

/**
 * Listado de reseñas (spec 9.5): estrellas, mes y año en hora de Buenos Aires (`formatMonthYear`),
 * el texto, el nombre y "Compra verificada" solo si la reseña es de una compra verificada. Sin
 * reseñas muestra "Todavía no hay reseñas de este producto…".
 *
 * @param props - Ver {@link ReviewListProps}.
 */
export function ReviewList({ reviews }: ReviewListProps): ReactNode {
  if (reviews.length === 0) {
    return <p className="m-0 py-5 text-[16px] text-neutral-400">{REVIEWS_COPY.empty}</p>
  }
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {reviews.map((review) => (
        <Reveal
          key={review.id}
          as="li"
          kind="up"
          className="flex flex-col gap-[10px] py-[22px]"
          style={SEPARATOR_STYLE}
        >
          <div className="flex items-center justify-between gap-3">
            <Stars value={review.rating} size={14} />
            <time dateTime={review.createdAt} className="text-[12px] text-neutral-500">
              {formatMonthYear(review.createdAt)}
            </time>
          </div>
          <p className="m-0 text-[16px] leading-[1.6]">{review.text}</p>
          <span className="text-[13px] text-neutral-400">
            {review.authorName}
            {review.verifiedPurchase ? ` · ${REVIEWS_COPY.verified}` : null}
          </span>
        </Reveal>
      ))}
    </ul>
  )
}
