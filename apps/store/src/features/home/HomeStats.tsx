import type { ReactNode } from 'react'
import type { HomeData } from './home-data'
import { HOME_CONTAINER } from './home-styles'
import { HOME_COPY } from './home.copy'
import { StatsBand } from './StatsBand'

/** Props de {@link HomeStats}. */
export interface HomeStatsProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Cuatro cifras animadas (spec 9.5): piezas del catálogo y líneas de producto salen del catálogo
 * publicado; provincias con envío y socios son texto editable (`HomeContent.stats`). Cada número va
 * centrado sobre su rótulo y los cuatro cuentan de 0 juntos cuando la banda está entera a la vista
 * ({@link StatsBand}).
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
      <StatsBand
        figures={figures}
        className={`${HOME_CONTAINER} grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-8 gap-y-10`}
      />
    </section>
  )
}
