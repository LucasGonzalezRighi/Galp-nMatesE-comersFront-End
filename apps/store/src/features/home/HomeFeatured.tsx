import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { HomeData } from './home-data'
import { Reveal } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { ProductCard } from '../product-card'
import { Eyebrow } from './Eyebrow'
import { FeaturedExit } from './FeaturedExit'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { HOME_COPY } from './home.copy'

/** Props de {@link HomeFeatured}. */
export interface HomeFeaturedProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Destacados (spec 9.5): los productos `featured` en la tarjeta Vitrina, en una grilla de hasta
 * cuatro columnas, con el link "Ver toda la tienda". No se dibuja si no hay destacados. En
 * escritorio y con movimiento la grilla se despide al salir de pantalla ({@link FeaturedExit}); el
 * título y el link no cambian.
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
          <div className="flex flex-col gap-[14px]">
            <Eyebrow>{featured.eyebrow}</Eyebrow>
            <Reveal kind="up" as="h2" className={HOME_SECTION_TITLE}>
              {featured.title}
            </Reveal>
          </div>
          <Button asChild variant="ghost">
            <Link href={asRoute('/tienda')}>
              {HOME_COPY.viewShop}
              <ArrowRightIcon size={14} aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <FeaturedExit className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-5 min-[1440px]:grid-cols-4">
          {data.featured.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              installments={installments}
              showNetPrice={priceDisplay.showNetPrice}
              index={index}
            />
          ))}
        </FeaturedExit>
      </div>
    </section>
  )
}
