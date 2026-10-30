import type { CSSProperties, ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { ProductSummary } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { Float, Magnetic, Reveal, Tilt } from '../../components/motion'
import { Button, ImageWithPlaceholder, Tag } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { HOME_ARROW_SIZE, HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { HOME_COPY, kitDiscountTitle, optionsLabel } from './home.copy'

/** Oscurece la parte de abajo de la foto para que se lea el texto. */
const SHADE_STYLE: CSSProperties = {
  background:
    'linear-gradient(180deg, transparent 45%, color-mix(in srgb, var(--color-background) 92%, transparent))',
}

/**
 * Hover de cada pieza del kit (además del `Tilt`): sube 4 px y el borde pasa a cobre al 40 % en
 * 240 ms; con menos movimiento solo cambia el borde.
 */
const PIECE_HOVER_CLASS =
  'ease-main transition-[translate,box-shadow] duration-240 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_40%,transparent)] motion-safe:hover:-translate-y-1'

/** Props de {@link KitPiece}. */
interface KitPieceProps {
  /** Nombre del paso: "Mate", "Bombilla" o "Yerba". */
  label: string
  /** Cuántas opciones comprables tiene el paso. */
  options: number
  /** Un producto del grupo, para mostrar su foto; sin foto se dibuja el marco punteado. */
  product: ProductSummary | null
  /** Retardo de entrada, en milisegundos. */
  delay: number
  /** Para que las tres no floten al unísono: retardo del vaivén, en milisegundos. */
  floatDelay: number
}

/** Una de las tres piezas del kit: foto, nombre y cantidad de opciones (sin número). */
function KitPiece({ label, options, product, delay, floatDelay }: KitPieceProps): ReactNode {
  return (
    <Reveal kind="up" delay={delay}>
      <Float delay={floatDelay}>
        <Tilt
          className={`${PIECE_HOVER_CLASS} bg-surface relative aspect-[3/4] overflow-hidden rounded-[14px] shadow-sm`}
        >
          <div aria-hidden="true" className="absolute inset-0">
            <ImageWithPlaceholder
              src={product?.mainImage?.url}
              alt=""
              label={label}
              sizes="(min-width: 1024px) 14vw, 30vw"
              className="size-full rounded-[14px]"
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={SHADE_STYLE}
          />
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-[2px]">
            <span className="text-[17px]">{label}</span>
            <span className="text-[11.5px] text-neutral-400">{optionsLabel(options)}</span>
          </div>
        </Tilt>
      </Float>
    </Reveal>
  )
}

/** El "+" que une dos piezas. */
function Plus(): ReactNode {
  return (
    <span aria-hidden="true" className="text-accent text-[24px]">
      +
    </span>
  )
}

/** Props de {@link HomeKit}. */
export interface HomeKitProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Bloque "Armá tu kit" (spec 9.5): el título con el descuento del kit, el botón hacia `/kit`, las
 * tres piezas (mate, bombilla y yerba) con la cantidad de opciones comprables de cada una y el
 * resumen "= Kit ronda completa". Sin descuento en el kit no se muestra ni el "−N%" del título ni
 * la etiqueta del resumen.
 *
 * @param props - Ver {@link HomeKitProps}.
 */
export function HomeKit({ data }: HomeKitProps): ReactNode {
  const { kitBlock } = data.content
  const { story, stats, kitDiscountLabel } = data
  return (
    <section className="py-[clamp(80px,10vw,150px)]">
      <div className={`${HOME_CONTAINER} flex flex-wrap items-center gap-14`}>
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-[22px]">
          <Reveal kind="up" as="h2" className={HOME_SECTION_TITLE}>
            {kitBlock.title}
            {kitDiscountLabel === null ? null : (
              <>
                {' '}
                <span className="text-accent-300">{kitDiscountTitle(kitDiscountLabel)}</span>
              </>
            )}
          </Reveal>
          <Reveal
            kind="up"
            as="p"
            delay={100}
            className="m-0 max-w-[44ch] text-[16px] leading-[1.65] text-neutral-300"
          >
            {kitBlock.text}
          </Reveal>
          <Reveal kind="up" delay={200} className="self-start">
            <Magnetic>
              <Button asChild variant="primary" size="lg">
                <Link href={asRoute('/kit')}>
                  {kitBlock.ctaLabel}
                  <ArrowRightIcon size={HOME_ARROW_SIZE} aria-hidden="true" />
                </Link>
              </Button>
            </Magnetic>
          </Reveal>
        </div>
        <div className="flex min-w-0 flex-[1.3_1_460px] flex-col gap-[18px]">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-[10px]">
            <KitPiece
              label={HOME_COPY.kitMate}
              options={stats.kitOptions.mate}
              product={story.hero}
              delay={0}
              floatDelay={0}
            />
            <Plus />
            <KitPiece
              label={HOME_COPY.kitBombilla}
              options={stats.kitOptions.bombilla}
              product={story.bombillas[0] ?? null}
              delay={150}
              floatDelay={700}
            />
            <Plus />
            <KitPiece
              label={HOME_COPY.kitYerba}
              options={stats.kitOptions.yerba}
              product={story.yerbas[0] ?? null}
              delay={300}
              floatDelay={1400}
            />
          </div>
          <Reveal
            kind="up"
            delay={450}
            className="bg-accent-900/60 flex items-center justify-between gap-3 rounded-[8px] px-[18px] py-[14px] shadow-[inset_0_0_0_1px_var(--color-accent-700)]"
          >
            <span className="text-[15px]">{HOME_COPY.kitComplete}</span>
            {kitDiscountLabel === null ? null : <Tag variant="accent2">{kitDiscountLabel}</Tag>}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
