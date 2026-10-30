import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'
import { introText, KIT_COPY } from './kit.copy'

/** Props de {@link KitHero}. */
export interface KitHeroProps {
  /** Descuento del kit (`PublicSettings.kitDiscountPercent`), un entero entre 0 y 30. */
  discountPercent: number
}

/**
 * Encabezado de "Armá tu kit": sobretítulo, el título "Tres pasos. Una ronda completa." que sube
 * línea por línea y la bajada con el descuento del kit.
 *
 * @param props - Ver {@link KitHeroProps}.
 * @throws {RangeError} Si el descuento no es un entero entre 0 y 100.
 */
export function KitHero({ discountPercent }: KitHeroProps): ReactNode {
  return (
    <section className="site-container flex flex-col gap-[18px] pt-[clamp(48px,7vw,96px)] pb-8">
      <span className="text-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase">
        <span aria-hidden="true" className="bg-accent h-px w-7" />
        {KIT_COPY.eyebrow}
      </span>
      <h1 className="text-[clamp(42px,6vw,84px)] leading-none tracking-[-0.035em]">
        <Reveal kind="rise" as="span">
          {KIT_COPY.titleFirst}
        </Reveal>
        <Reveal kind="rise" as="span" delay={120} contentClassName="text-accent-300">
          {KIT_COPY.titleSecond}
        </Reveal>
      </h1>
      <Reveal kind="up" as="p" delay={240} className="max-w-[52ch] leading-[1.65] text-neutral-300">
        {introText(discountPercent)}
      </Reveal>
    </section>
  )
}
