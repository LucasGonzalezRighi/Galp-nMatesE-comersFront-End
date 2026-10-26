import type { ReactNode } from 'react'
import type { ReviewPage } from '@galpon/api-client'
import { ReviewList } from './ReviewList'
import { ReviewsLayout } from './ReviewsLayout'
import { ReviewSummary } from './ReviewSummary'

/** Props de {@link ReviewsSection}. */
export interface ReviewsSectionProps {
  /** Slug actual del producto. */
  slug: string
  /** Nombre del producto. */
  productName: string
  /** Primera página de reseñas aprobadas, con las estadísticas de todas. */
  page: ReviewPage
}

/**
 * Sección de reseñas de la ficha (spec 9.5), con el ancla `#resenas` a la que lleva el enlace
 * "N reseñas" de la cabecera: resumen con promedio y distribución, listado y formulario para
 * escribir una reseña.
 *
 * @param props - Ver {@link ReviewsSectionProps}.
 */
export function ReviewsSection({ slug, productName, page }: ReviewsSectionProps): ReactNode {
  return (
    <section
      id="resenas"
      className="mx-auto max-w-[1280px] scroll-mt-[90px] px-[clamp(20px,5vw,64px)] pt-[clamp(72px,9vw,120px)]"
    >
      <ReviewsLayout
        slug={slug}
        productName={productName}
        summary={<ReviewSummary stats={page.stats} />}
        list={<ReviewList reviews={page.items} />}
      />
    </section>
  )
}
