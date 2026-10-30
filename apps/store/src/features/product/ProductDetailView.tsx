import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import type { ProductDetail, ProductTabsContent, PublicSettings } from '@galpon/api-client'
import { Ping, Reveal } from '../../components/motion'
import { InstallmentsNote, NetPrice, Price, Stars } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { formatReviewCount } from '../reviews'
import { KitBand } from './KitBand'
import { buildProductTabs } from './product-tabs'
import { PRODUCT_COPY } from './product.copy'
import { ProductBreadcrumbs } from './ProductBreadcrumbs'
import { ProductGallery } from './ProductGallery'
import { ProductGuarantees } from './ProductGuarantees'
import { ProductPurchase } from './ProductPurchase'
import { ProductTabs } from './ProductTabs'

/** Props de {@link ProductDetailView}. */
export interface ProductDetailViewProps {
  /** La ficha del producto. */
  product: ProductDetail
  /** Ajustes públicos de la tienda: cuotas, precio sin impuestos, descuento del kit y mail. */
  settings: PublicSettings
  /** Textos de las pestañas por grupo (los títulos cambian en las yerbas). */
  tabsContent: ProductTabsContent
}

/** Línea que separa la descripción de la compra, con los extremos desvanecidos. */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/** Verde del punto de stock (el del diseño, `accent-2-400`). */
const IN_STOCK_COLOR = 'var(--color-accent-2-400)'

/**
 * Parte de arriba de la ficha (spec 9.5): migas, galería, línea, nombre, promedio de reseñas
 * (lleva a `#resenas`), precio con "Precio sin impuestos nacionales" y la leyenda de cuotas, stock
 * con el punto que late, descripción, compra (opciones, cantidad, botones o "Consultar por
 * mail"), garantías y pestañas; en los mates, además, la banda "Completá la ronda".
 *
 * @param props - Ver {@link ProductDetailViewProps}.
 */
export function ProductDetailView({
  product,
  settings,
  tabsContent,
}: ProductDetailViewProps): ReactNode {
  const categoryHref = asRoute(`/tienda/${encodeURIComponent(product.categorySlug)}`)
  const hasReviews = product.rating.count > 0

  return (
    <>
      <ProductBreadcrumbs
        categoryName={product.categoryName}
        categorySlug={product.categorySlug}
        productName={product.name}
      />
      <section className="site-container flex flex-wrap items-start gap-x-14 gap-y-10 pt-6">
        <div className="min-w-0 flex-[1.1_1_440px] lg:sticky lg:top-[88px]">
          <ProductGallery productName={product.name} code={product.code} images={product.images} />
        </div>
        <div className="flex max-w-[560px] min-w-0 flex-[1_1_380px] flex-col gap-[22px]">
          <div className="flex flex-col gap-3">
            <Link
              href={categoryHref}
              className="text-accent self-start text-[12px] tracking-[0.14em] uppercase no-underline"
            >
              {product.categoryName}
            </Link>
            <Reveal
              as="h1"
              kind="up"
              className="m-0 text-[clamp(32px,4vw,52px)] leading-[1.04] font-medium tracking-[-0.03em]"
            >
              {product.name}
            </Reveal>
            <a
              href="#resenas"
              className="flex items-center gap-[10px] self-start text-[13px] text-neutral-400 no-underline hover:text-neutral-200"
            >
              <Stars value={product.rating.average} size={14} />
              {hasReviews ? formatReviewCount(product.rating.count) : PRODUCT_COPY.noReviews}
            </a>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-x-[14px] gap-y-1">
              <Price amount={product.priceArs} size="lg" />
              <InstallmentsNote
                price={product.priceArs}
                installments={settings.installments}
                className="text-[13px]! text-neutral-400!"
              />
            </div>
            {settings.priceDisplay.showNetPrice ? <NetPrice amount={product.netPriceArs} /> : null}
          </div>
          <div className="flex items-center gap-[10px] text-[13px] text-neutral-300">
            {product.isSoldOut ? (
              <span aria-hidden="true" className="size-2 flex-none rounded-full bg-neutral-500" />
            ) : (
              <Ping color={IN_STOCK_COLOR} haloColor={IN_STOCK_COLOR} />
            )}
            {product.isSoldOut ? PRODUCT_COPY.outOfStock : PRODUCT_COPY.inStock}
          </div>
          <p className="m-0 text-[15.5px] leading-[1.7] text-neutral-300">{product.description}</p>
          <div aria-hidden="true" className="h-px" style={DIVIDER_STYLE} />
          <ProductPurchase product={product} contactEmail={settings.contactEmail} />
          <ProductGuarantees />
          <ProductTabs tabs={buildProductTabs(product, tabsContent)} />
        </div>
      </section>
      {product.group === 'mate' ? (
        <KitBand mateSlug={product.slug} discountPercent={settings.kitDiscountPercent} />
      ) : null}
    </>
  )
}
