import type { ReactNode } from 'react'
import type { HomeData } from './home-data'
import { CountUp, Reveal } from '../../components/motion'
import { HOME_CONTAINER } from './home-styles'
import { HOME_COPY } from './home.copy'

/** Props de {@link HomeStats}. */
export interface HomeStatsProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Cuatro cifras animadas (spec 9.5): piezas del catálogo y líneas de producto salen del catálogo
 * publicado; provincias con envío y socios son texto editable (`HomeContent.stats`).
 *
 * @param props - Ver {@link HomeStatsProps}.
 */
export function HomeStats({ data }: HomeStatsProps): ReactNode {
  const figures = [
    { value: data.stats.pieces, label: HOME_COPY.statPieces },
    { value: data.stats.lines, label: HOME_COPY.statLines },
    { value: data.content.stats.provinces, label: HOME_COPY.statProvinces },
    { value: data.content.stats.partners, label: HOME_COPY.statPartners },
  ]
  return (
    <section className="home-bg-stats relative overflow-hidden py-[clamp(56px,7vw,96px)]">
      <div
        className={`${HOME_CONTAINER} grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-8 gap-y-10`}
      >
        {figures.map((figure, position) => (
          <Reveal key={figure.label} kind="up" delay={position * 100}>
            <p className="m-0 text-[clamp(52px,6vw,84px)] leading-none font-medium tracking-[-0.03em] tabular-nums">
              <CountUp value={figure.value} />
            </p>
            <p className="text-foreground/66 mt-[14px] mb-0 text-[13px] tracking-[0.08em] uppercase">
              {figure.label}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
