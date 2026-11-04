import type { ReactNode } from 'react'
import type { ProductSummary, PublicSettings } from '@galpon/api-client'
import { Reveal } from '../../components/motion'
import { PRODUCT_CARD_COPY, ProductGrid } from '../product-card'
import { PRODUCT_COPY } from './product.copy'

/** Props de {@link RelatedProducts}. */
export interface RelatedProductsProps {
  /** Productos relacionados (hasta 30); sin ninguno, no se dibuja la sección. */
  products: readonly ProductSummary[]
  /** Ajustes públicos de la tienda: cuotas y precio sin impuestos de las tarjetas. */
  settings: Pick<PublicSettings, 'installments' | 'priceDisplay'>
}

/** Hileras completas antes de "Ver más productos". */
const RELATED_ROWS = 3

/** Columnas que se suponen en el servidor y antes de medir: las de `shop-container`. */
const RELATED_DEFAULT_COLUMNS = 5

/** `sizes` de las fotos: cuatro columnas en escritorio, dos en tabletas y una en celulares. */
const CARD_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'

/**
 * "Más para la ronda": los productos relacionados al pie de la ficha (spec 9.5), en el contenedor
 * angosto de la tienda (`shop-container`: hasta 5 tarjetas por hilera, con el título alineado a la
 * grilla) y con la `ProductGrid` común: 3 hileras completas y "Ver más productos" para el resto.
 * La ficha la dibuja con `key={slug}`, así al pasar a otro producto vuelve a plegarse. Sin
 * productos no dibuja nada.
 *
 * @param props - Ver {@link RelatedProductsProps}.
 */
export function RelatedProducts({ products, settings }: RelatedProductsProps): ReactNode {
  if (products.length === 0) return null
  return (
    <section className="shop-container pt-[clamp(72px,9vw,120px)]">
      <div className="mb-8 flex flex-col gap-[14px]">
        <span className="text-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase">
          <span aria-hidden="true" className="bg-accent h-px w-7" />
          {PRODUCT_COPY.relatedEyebrow}
        </span>
        <Reveal
          as="h2"
          kind="up"
          className="m-0 text-[clamp(28px,3.4vw,44px)] leading-[1.06] font-medium tracking-[-0.025em]"
        >
          {PRODUCT_COPY.relatedTitle}
        </Reveal>
      </div>
      <ProductGrid
        products={products}
        rows={RELATED_ROWS}
        defaultColumns={RELATED_DEFAULT_COLUMNS}
        moreLabel={PRODUCT_CARD_COPY.moreProducts}
        installments={settings.installments}
        showNetPrice={settings.priceDisplay.showNetPrice}
        sizes={CARD_SIZES}
      />
    </section>
  )
}
