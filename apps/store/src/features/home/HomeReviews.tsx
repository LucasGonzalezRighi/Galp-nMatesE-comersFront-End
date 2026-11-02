import type { ReactNode } from 'react'
import type { HomeData } from './home-data'
import { Reveal } from '../../components/motion'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { ReviewsCollage } from './ReviewsCollage'

/** Props de {@link HomeReviews}. */
export interface HomeReviewsProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Reseñas destacadas (spec 9.5): el título y, debajo, las reseñas pegadas sobre el mate
 * ({@link ReviewsCollage}): la foto del mate en recortes y la nota de cada cliente clavada a la
 * parte que nombra, con el producto, que lleva a su ficha. No se dibuja si no hay reseñas
 * destacadas. Es el cierre del inicio: en escritorio la página la deja quieta mientras sube el pie
 * (eso lo arma `HomePage`).
 *
 * @param props - Ver {@link HomeReviewsProps}.
 */
export function HomeReviews({ data }: HomeReviewsProps): ReactNode {
  if (data.reviews.length === 0) return null
  const { reviews } = data.content
  return (
    <section className="pb-[clamp(64px,6vw,96px)]">
      <div className={HOME_CONTAINER}>
        <Reveal kind="up" as="h2" className={`${HOME_SECTION_TITLE} mb-10`}>
          {reviews.title}
        </Reveal>
        <ReviewsCollage reviews={data.reviews} />
      </div>
    </section>
  )
}
