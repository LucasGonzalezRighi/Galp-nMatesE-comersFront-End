import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import type { FeaturedReview } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { Reveal, Tilt } from '../../components/motion'
import { Stars } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { Eyebrow } from './Eyebrow'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { quoteLabel } from './home.copy'

/** Brillo cobrizo que sigue al mouse (`--mx`, `--my` y `--hov` los publica `Tilt`). */
const GLOW_STYLE: CSSProperties = {
  background:
    'radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 70%)',
  opacity: 'var(--hov, 0)',
  transition: 'opacity .4s',
}

/** Retardo de entrada entre una reseña y la siguiente, en milisegundos. */
const REVIEW_STAGGER_MS = 120

/** Props de {@link ReviewCard}. */
interface ReviewCardProps {
  /** La reseña, con el producto reseñado. */
  review: FeaturedReview
  /** Su lugar en la fila, desde 0 (define el retardo de entrada). */
  position: number
}

/** Tarjeta de una reseña destacada: estrellas, texto entre comillas, quién la escribió y el producto. */
function ReviewCard({ review, position }: ReviewCardProps): ReactNode {
  return (
    <Reveal kind="up" delay={position * REVIEW_STAGGER_MS} className="h-full">
      <Tilt className="bg-surface relative box-border flex h-full flex-col gap-4 rounded-[14px] p-6 shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={GLOW_STYLE}
        />
        <Stars value={review.rating} size={15} className="text-accent" />
        <p className="m-0 text-[17px] leading-[1.55] tracking-[-0.005em]">
          {quoteLabel(review.text)}
        </p>
        <div className="mt-auto flex justify-between gap-3 text-[13px]">
          <span>{review.authorName}</span>
          <Link
            href={asRoute(`/producto/${encodeURIComponent(review.product.slug)}`)}
            className="text-accent-300 hover:text-accent-200 no-underline"
          >
            {review.product.name}
          </Link>
        </div>
      </Tilt>
    </Reveal>
  )
}

/** Props de {@link HomeReviews}. */
export interface HomeReviewsProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Reseñas destacadas (spec 9.5): hasta tres tarjetas con la puntuación, el texto, el nombre de
 * quien escribió y el producto, que lleva a su ficha. No se dibuja si no hay reseñas destacadas.
 *
 * @param props - Ver {@link HomeReviewsProps}.
 */
export function HomeReviews({ data }: HomeReviewsProps): ReactNode {
  if (data.reviews.length === 0) return null
  const { reviews } = data.content
  return (
    <section className="pb-[clamp(80px,10vw,140px)]">
      <div className={HOME_CONTAINER}>
        <div className="mb-10 flex flex-col gap-[14px]">
          <Eyebrow>{reviews.eyebrow}</Eyebrow>
          <Reveal kind="up" as="h2" className={HOME_SECTION_TITLE}>
            {reviews.title}
          </Reveal>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5">
          {data.reviews.map((review, position) => (
            <ReviewCard key={review.id} review={review} position={position} />
          ))}
        </div>
      </div>
    </section>
  )
}
