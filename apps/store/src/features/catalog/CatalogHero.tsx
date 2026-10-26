import type { CSSProperties, ReactNode } from 'react'
import { Reveal, RiseText } from '../../components/motion'
import { CATALOG_COPY } from './catalog.copy'

/** Cuadrícula de líneas finas del fondo, desvanecida hacia abajo y a la izquierda (arriba a la derecha es lo más visible). */
const HERO_GRID_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(color-mix(in srgb, var(--color-foreground) 5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-foreground) 5%, transparent) 1px, transparent 1px)',
  backgroundSize: '64px 64px',
  WebkitMaskImage: 'radial-gradient(ellipse 50% 80% at 85% 0%, #000, transparent 70%)',
  maskImage: 'radial-gradient(ellipse 50% 80% at 85% 0%, #000, transparent 70%)',
}

/** Props de {@link CatalogHero}. */
export interface CatalogHeroProps {
  /** Título de la página: el nombre de la línea o "Todo el catálogo". */
  title: string
  /** Bajada: la descripción de la línea o la del catálogo. */
  blurb: string
  /** Contador ya formateado ("27 piezas"). */
  countLabel: string
}

/**
 * Cabecera del catálogo (diseño, pantalla Tienda): sobretítulo, título que sube desde una
 * máscara, bajada y, a la derecha, el contador de piezas. El contador es una región viva
 * (`<output>`), así los lectores de pantalla anuncian cuántas piezas quedan al buscar.
 *
 * @param props - Ver {@link CatalogHeroProps}.
 */
export function CatalogHero({ title, blurb, countLabel }: CatalogHeroProps): ReactNode {
  return (
    <section className="relative overflow-hidden pt-[clamp(48px,7vw,96px)] pb-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={HERO_GRID_STYLE}
      />
      <div className="relative mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-6 px-[clamp(20px,5vw,64px)]">
        <div className="flex max-w-[720px] flex-col gap-4">
          <span className="text-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase">
            <span aria-hidden="true" className="bg-accent h-px w-7" />
            {CATALOG_COPY.eyebrow}
          </span>
          <RiseText
            as="h1"
            lines={[title]}
            className="m-0 text-[length:clamp(42px,6vw,84px)] leading-none tracking-[-0.035em]"
          />
          <Reveal
            as="p"
            kind="up"
            delay={120}
            className="m-0 max-w-[52ch] text-[16px] leading-[1.65] text-neutral-300"
          >
            {blurb}
          </Reveal>
        </div>
        <output className="text-[13px] text-neutral-400 tabular-nums">{countLabel}</output>
      </div>
    </section>
  )
}
