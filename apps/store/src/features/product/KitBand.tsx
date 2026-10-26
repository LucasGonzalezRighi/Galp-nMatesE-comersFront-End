import type { CSSProperties, ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import { formatDiscountPercent } from '@galpon/domain'
import { Magnetic, Reveal } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { kitBandTitle, PRODUCT_COPY } from './product.copy'

/** Props de {@link KitBand}. */
export interface KitBandProps {
  /** Slug del mate: el kit se arma con ese mate elegido (`/kit?mate={slug}`). */
  mateSlug: string
  /** Descuento del kit (`PublicSettings.kitDiscountPercent`), un entero de 0 a 100. */
  discountPercent: number
}

/** Fondo de la banda: un resplandor cobrizo arriba a la derecha sobre `surface`. */
const BAND_STYLE: CSSProperties = {
  background:
    'radial-gradient(600px 300px at 90% 0%, color-mix(in srgb, var(--color-accent-800) 70%, transparent), transparent 70%), var(--color-surface)',
}

/**
 * Banda "Completá la ronda" de la ficha de un mate (spec 9.5): invita a sumar bombilla y yerba
 * con el descuento del kit y lleva a `/kit?mate={slug}`.
 *
 * @param props - Ver {@link KitBandProps}.
 * @throws {RangeError} Si el descuento no es un entero entre 0 y 100.
 */
export function KitBand({ mateSlug, discountPercent }: KitBandProps): ReactNode {
  const discount = discountPercent > 0 ? formatDiscountPercent(discountPercent) : null
  return (
    <section className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,64px)] pt-[clamp(64px,8vw,104px)]">
      <Reveal
        kind="up"
        className="flex flex-wrap items-center justify-between gap-6 rounded-[14px] p-[clamp(24px,4vw,44px)] shadow-sm"
        style={BAND_STYLE}
      >
        <div className="flex max-w-[540px] flex-col gap-[10px]">
          <span className="text-accent text-[12px] tracking-[0.14em] uppercase">
            {PRODUCT_COPY.kitEyebrow}
          </span>
          <span className="text-[clamp(22px,2.6vw,32px)] leading-[1.15] tracking-[-0.02em]">
            {kitBandTitle(discount)}
          </span>
        </div>
        <Magnetic strength={0.3}>
          <Button asChild size="lg">
            <Link href={asRoute(`/kit?mate=${encodeURIComponent(mateSlug)}`)}>
              {PRODUCT_COPY.kitButton}
              <ArrowRightIcon size={16} aria-hidden="true" />
            </Link>
          </Button>
        </Magnetic>
      </Reveal>
    </section>
  )
}
