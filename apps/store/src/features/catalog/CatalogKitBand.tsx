import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { formatDiscountPercent } from '@galpon/domain'
import { Magnetic, Reveal } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { CATALOG_COPY } from './catalog.copy'

/** Fondo de la banda: un resplandor de cobre arriba a la derecha sobre el color `surface`. */
const BAND_STYLE: CSSProperties = {
  background:
    'radial-gradient(600px 260px at 90% 0%, color-mix(in srgb, var(--color-accent-800) 70%, transparent), transparent 70%), var(--color-surface)',
}

/** Props de {@link CatalogKitBand}. */
export interface CatalogKitBandProps {
  /** Descuento del kit en porcentaje entero (`PublicSettings.kitDiscountPercent`). */
  discountPercent: number
}

/**
 * Banda final del catálogo hacia el kit: "¿Ya elegiste el mate? Sumale bombilla y yerba." con el
 * descuento del kit y el botón "Armar mi kit". Si el descuento es 0 no se nombra.
 *
 * @param props - Ver {@link CatalogKitBandProps}.
 * @throws {RangeError} Si el descuento no es un entero entre 0 y 100.
 */
export function CatalogKitBand({ discountPercent }: CatalogKitBandProps): ReactNode {
  const discount = formatDiscountPercent(discountPercent)
  return (
    <Reveal
      kind="up"
      className="mt-[72px] flex flex-wrap items-center justify-between gap-5 rounded-[14px] p-[clamp(22px,3vw,36px)] shadow-sm"
      style={BAND_STYLE}
    >
      <div className="flex max-w-[560px] flex-col gap-[6px]">
        <span className="text-[22px] tracking-[-0.015em]">{CATALOG_COPY.kitTitle}</span>
        {discountPercent > 0 ? (
          <span className="text-[14px] text-neutral-400">{CATALOG_COPY.kitSubtitle(discount)}</span>
        ) : null}
      </div>
      <Magnetic reach={10} className="self-center!">
        <Button asChild className="min-h-[44px] px-5!">
          <Link href={asRoute('/kit')}>{CATALOG_COPY.kitCta}</Link>
        </Button>
      </Magnetic>
    </Reveal>
  )
}
