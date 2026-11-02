import type { ReactNode } from 'react'
import type { ReviewStats } from '@galpon/api-client'
import { CountUp, Reveal } from '../../components/motion'
import { Stars } from '../../components/ui'
import { formatReviewCount } from './reviews-format'
import { REVIEWS_COPY, starLabel } from './reviews.copy'

/** Props de {@link ReviewSummary}. */
export interface ReviewSummaryProps {
  /** Estadísticas de todas las reseñas aprobadas del producto (`ReviewPage.stats`). */
  stats: ReviewStats
}

/**
 * Resumen de reseñas (spec 9.5): el promedio grande con contador animado, las estrellas, la
 * cantidad y la distribución de 5 a 1 estrellas con barras que se estiran al entrar en pantalla.
 * Sin reseñas muestra un guion en lugar del promedio y "Todavía no hay reseñas".
 *
 * @param props - Ver {@link ReviewSummaryProps}.
 */
export function ReviewSummary({ stats }: ReviewSummaryProps): ReactNode {
  const hasReviews = stats.count > 0
  return (
    <>
      <h2 className="text-accent m-0 flex items-center gap-3 text-[12px] font-normal tracking-[0.14em] uppercase">
        <span aria-hidden="true" className="bg-accent h-px w-7" />
        {REVIEWS_COPY.eyebrow}
      </h2>
      <div className="flex items-baseline gap-[10px]">
        <span className="text-[72px] leading-none tracking-[-0.04em] tabular-nums">
          {hasReviews ? <CountUp value={stats.average} decimals={1} /> : REVIEWS_COPY.noAverage}
        </span>
        <span className="text-neutral-400">{REVIEWS_COPY.outOfFive}</span>
      </div>
      <Stars value={stats.average} size={18} />
      <span className="text-[13px] text-neutral-400">
        {hasReviews ? formatReviewCount(stats.count) : REVIEWS_COPY.noneYet}
      </span>
      <ul
        aria-label={REVIEWS_COPY.distributionLabel}
        className="m-0 flex list-none flex-col gap-2 p-0"
      >
        {stats.distribution.map((row) => (
          <li
            key={row.stars}
            className="grid grid-cols-[14px_1fr_22px] items-center gap-[10px] text-[12px] text-neutral-400 tabular-nums"
          >
            <span className="sr-only">{`${starLabel(row.stars)}: ${String(row.count)}`}</span>
            <span aria-hidden="true">{row.stars}</span>
            <span
              aria-hidden="true"
              className="relative h-1 overflow-hidden rounded-[2px] bg-neutral-800"
            >
              <Reveal
                kind="bar"
                className="bg-accent absolute inset-y-0 left-0 rounded-[2px] shadow-[0_0_10px_var(--color-accent)]"
                style={{ width: `${String(row.percent)}%` }}
              />
            </span>
            <span aria-hidden="true" className="text-right">
              {row.count.toLocaleString('es-AR')}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
