import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { HomeData } from './home-data'
import { Reveal } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { FeaturedGrid } from './FeaturedGrid'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { HOME_COPY } from './home.copy'

/** Props de {@link HomeFeatured}. */
export interface HomeFeaturedProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Destacados (spec 9.5, "Los más vendidos"): los productos `featured` en la tarjeta Vitrina, en una
 * grilla de hasta cuatro columnas ({@link FeaturedGrid}), con el link "Ver toda la tienda". No se
 * dibuja si no hay destacados. En el celular (una columna) se ven 3 y "Ver más productos"; desde la
 * tableta, todos. En escritorio y con movimiento la grilla se despide al salir de pantalla
 * (`FeaturedExit`); el título y el link no cambian.
 *
 * @param props - Ver {@link HomeFeaturedProps}.
 */
export function HomeFeatured({ data }: HomeFeaturedProps): ReactNode {
  if (data.featured.length === 0) return null
  const { featured } = data.content
  const { installments, priceDisplay } = data.settings
  return (
    <section className="pt-[clamp(80px,10vw,140px)] pb-[clamp(40px,6vw,80px)]">
      <div className={HOME_CONTAINER}>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <Reveal kind="up" as="h2" className={HOME_SECTION_TITLE}>
            {featured.title}
          </Reveal>
          <Button asChild variant="ghost">
            <Link href={asRoute('/tienda')}>
              {HOME_COPY.viewShop}
              <ArrowRightIcon size={14} aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <FeaturedGrid
          products={data.featured}
          installments={installments}
          showNetPrice={priceDisplay.showNetPrice}
        />
      </div>
    </section>
  )
}
