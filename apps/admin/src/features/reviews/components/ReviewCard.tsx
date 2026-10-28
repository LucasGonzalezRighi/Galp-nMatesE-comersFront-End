import type { ReactNode } from 'react'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { useId, useRef } from 'react'
import type { AdminReview } from '@galpon/api-client'
import { formatDate } from '@galpon/domain'
import type { ReviewAction } from '../review-actions'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { availableReviewActions, REVIEW_ACTIONS, reviewAfter } from '../review-actions'
import { storeProductUrl, toParagraphs } from '../review-format'
import { REVIEWS_COPY } from '../reviews.copy'
import { ReviewStars } from './ReviewStars'

/** Props de {@link ReviewCard}. */
export interface ReviewCardProps {
  /** La reseña. */
  review: AdminReview
  /** URL de la tienda, sin barra final: el nombre del producto enlaza a su ficha. */
  storeUrl: string
  /** Se llama con la acción elegida. */
  onAction: (action: ReviewAction) => void
  /** Deshabilita las acciones mientras se guarda un cambio de esta reseña. */
  isPending?: boolean
}

/**
 * Antes de que la tarjeta salga de la lista, pasa el foco a la siguiente (o a la anterior), así
 * quien usa el teclado no lo pierde.
 */
function focusNeighbor(card: HTMLElement | null): void {
  const item = card?.closest('li')
  const neighbor = item?.nextElementSibling ?? item?.previousElementSibling
  const target = neighbor?.querySelector('article')
  target?.focus()
}

/**
 * Tarjeta de una reseña para moderar: estrellas, etiquetas ("Compra verificada", "Destacada"),
 * el producto (enlace a su ficha en una pestaña nueva), autor, fecha, el texto completo en
 * párrafos y las acciones que corresponden a su estado.
 *
 * @param props - Ver {@link ReviewCardProps}.
 * @throws {RangeError} Si la puntuación no es de 1 a 5, el estado no se conoce o falta el slug.
 */
export function ReviewCard({
  review,
  storeUrl,
  onAction,
  isPending = false,
}: ReviewCardProps): ReactNode {
  const titleId = useId()
  const cardRef = useRef<HTMLElement>(null)

  function handleAction(action: ReviewAction) {
    if (reviewAfter(review, action).status !== review.status) focusNeighbor(cardRef.current)
    onAction(action)
  }

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6"
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ReviewStars rating={review.rating} />
          {review.verifiedPurchase && <Badge tone="success">{REVIEWS_COPY.verifiedPurchase}</Badge>}
          {review.featured && <Badge tone="accent">{REVIEWS_COPY.featured}</Badge>}
        </div>
        <h3 id={titleId} className="text-h5">
          <a
            href={storeProductUrl(storeUrl, review.product.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent inline-flex items-center gap-1 transition-colors motion-reduce:transition-none"
          >
            {review.product.name}
            <ArrowSquareOutIcon size={18} weight="regular" aria-hidden="true" />
            <span className="sr-only">{REVIEWS_COPY.opensInNewTab}</span>
          </a>
        </h3>
        <p className="flex flex-wrap gap-x-3 text-sm text-neutral-400">
          <span>{review.authorName}</span>
          <time dateTime={review.createdAt} className="tabular-nums">
            {formatDate(review.createdAt)}
          </time>
        </p>
      </header>
      <div className="flex flex-col gap-2 break-words">
        {toParagraphs(review.text).map((paragraph, index) => (
          // Los párrafos no tienen identidad propia: la posición es la clave.
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {availableReviewActions(review).map((action) => (
          <Button
            key={action}
            variant={REVIEW_ACTIONS[action].variant}
            disabled={isPending}
            onClick={() => {
              handleAction(action)
            }}
          >
            {REVIEW_ACTIONS[action].label}
          </Button>
        ))}
      </div>
    </article>
  )
}
