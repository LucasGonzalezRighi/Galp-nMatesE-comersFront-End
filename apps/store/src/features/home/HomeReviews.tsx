import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import type { FeaturedReview } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { Reveal, Tilt } from '../../components/motion'
import { Stars } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { quoteLabel } from './home.copy'
import { ReviewsMarquee } from './ReviewsMarquee'

/** Brillo cobrizo que sigue al mouse (`--mx`, `--my` y `--hov` los publica `Tilt`). */
const GLOW_STYLE: CSSProperties = {
  background:
    'radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 70%)',
  opacity: 'var(--hov, 0)',
  transition: 'opacity .4s',
}

/**
 * Tarjeta de reseña: con el mouse encima (o el foco en su link) sube 4 px y el borde pasa a cobre
 * al 40 % (240 ms); con menos movimiento solo cambia el borde.
 */
const CARD_CLASS =
  'bg-surface ease-main relative box-border flex h-full flex-col gap-4 rounded-[14px] p-6 shadow-sm transition-[translate,box-shadow] duration-240 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_40%,transparent)] has-focus-visible:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_40%,transparent)] motion-safe:hover:-translate-y-1 motion-safe:has-focus-visible:-translate-y-1'

/** Props de {@link ReviewCard}. */
interface ReviewCardProps {
  /** La reseña, con el producto reseñado. */
  review: FeaturedReview
}

/** Tarjeta de una reseña destacada: estrellas, texto entre comillas, quién la escribió y el producto. */
function ReviewCard({ review }: ReviewCardProps): ReactNode {
  return (
    <Tilt className={CARD_CLASS}>
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
  )
}

/** Props de {@link HomeReviews}. */
export interface HomeReviewsProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Reseñas destacadas (spec 9.5, Ruling MR-12): el rótulo y el título dentro del contenedor y,
 * debajo, una cinta continua de borde a borde de la ventana ({@link ReviewsMarquee}) con tarjetas
 * con la puntuación, el texto, el nombre de quien escribió y el producto, que lleva a su ficha. No
 * se dibuja si no hay reseñas destacadas. Es el cierre del inicio: en escritorio la página la deja
 * quieta mientras sube el pie (eso lo arma `HomePage`).
 *
 * @param props - Ver {@link HomeReviewsProps}.
 */
export function HomeReviews({ data }: HomeReviewsProps): ReactNode {
  if (data.reviews.length === 0) return null
  const { reviews } = data.content
  return (
    <section className="pb-[clamp(80px,10vw,140px)]">
      <div className={HOME_CONTAINER}>
        <Reveal kind="up" as="h2" className={`${HOME_SECTION_TITLE} mb-10`}>
          {reviews.title}
        </Reveal>
      </div>
      <Reveal kind="up">
        <ReviewsMarquee
          items={data.reviews.map((review) => ({
            id: review.id,
            card: <ReviewCard review={review} />,
          }))}
        />
      </Reveal>
    </section>
  )
}
