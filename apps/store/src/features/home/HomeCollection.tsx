import type { CSSProperties, ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Image from 'next/image'
import Link from 'next/link'
import type { Category } from '@galpon/api-client'
import type { HomeData } from './home-data'
import {
  Float,
  HorizontalScroll,
  HorizontalScrollProgress,
  Reveal,
  Tilt,
} from '../../components/motion'
import { ImageWithPlaceholder } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { Eyebrow } from './Eyebrow'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { HOME_COPY, orderLabel, piecesLabel } from './home.copy'

/** Medidas de las tarjetas de la pista, como el diseño: no más de 440 px de ancho ni 500 de alto. */
const CARD_SIZE = 'h-[min(56vh,500px)] flex-none'

/** La foto se corre en sentido contrario al mouse (`--px`/`--py` los publica `Tilt`). */
const PHOTO_STYLE: CSSProperties = {
  transform: 'translate3d(calc(var(--px, 0) * -18px), calc(var(--py, 0) * -18px), 0)',
  transition: 'transform .5s cubic-bezier(.2,.8,.2,1)',
}

/** Oscurece arriba y abajo de la foto para que se lean el número y el texto. */
const SHADE_STYLE: CSSProperties = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-background) 40%, transparent), transparent 28%, transparent 42%, color-mix(in srgb, var(--color-background) 95%, transparent) 90%)',
}

/** Brillo que sigue al mouse. */
const GLOW_STYLE: CSSProperties = {
  background:
    'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--color-accent-300) 18%, transparent), transparent 55%)',
  mixBlendMode: 'screen',
  opacity: 'var(--hov, 0)',
  transition: 'opacity .4s',
}

/** Props de {@link LineCard}. */
interface LineCardProps {
  /** La línea de producto. */
  line: Category
  /** Su lugar en la colección, desde 1. */
  position: number
}

/** Tarjeta de una línea: foto, número, cantidad de piezas, nombre, descripción y "Ver línea". */
function LineCard({ line, position }: LineCardProps): ReactNode {
  return (
    <Tilt
      className={`${CARD_SIZE} bg-surface has-focus-visible:outline-accent relative w-[min(78vw,440px)] cursor-pointer overflow-hidden rounded-[14px] shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2`}
    >
      <div aria-hidden="true" className="absolute -inset-[5%]" style={PHOTO_STYLE}>
        <ImageWithPlaceholder
          src={line.image?.url}
          alt=""
          sizes="(min-width: 640px) 440px, 78vw"
          className="size-full"
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={SHADE_STYLE}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={GLOW_STYLE} />
      <div className="pointer-events-none absolute top-[18px] right-5 left-5 flex justify-between tabular-nums">
        <span className="text-accent-300 text-[13px]">{orderLabel(position)}</span>
        <span className="text-[12px] text-neutral-300">{piecesLabel(line.productCount)}</span>
      </div>
      <div className="absolute right-5 bottom-5 left-5 flex flex-col gap-[10px]">
        <h3 className="text-[clamp(26px,3vw,36px)] tracking-[-0.02em]">
          <Link
            href={asRoute(`/tienda/${encodeURIComponent(line.slug)}`)}
            className="text-inherit no-underline after:absolute after:inset-0 after:content-['']"
          >
            {line.name}
          </Link>
        </h3>
        <p className="max-w-[36ch] text-[14px] leading-[1.55] text-neutral-300">{line.blurb}</p>
        <span
          aria-hidden="true"
          className="text-accent-300 inline-flex items-center gap-2 text-[13px]"
        >
          {HOME_COPY.viewLine}
          <ArrowRightIcon size={14} />
        </span>
      </div>
    </Tilt>
  )
}

/** Props de {@link HomeCollection}. */
export interface HomeCollectionProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Colección en scroll horizontal (spec 9.5): la sección queda fija y las líneas de producto
 * pasan de lado a lado con el scroll, con una barra de avance "01 — 06" y, al final, la tarjeta
 * "Ver todo el catálogo · N piezas". Con `prefers-reduced-motion: reduce` es una fila con scroll
 * propio. No se dibuja si no hay líneas con piezas.
 *
 * @param props - Ver {@link HomeCollectionProps}.
 */
export function HomeCollection({ data }: HomeCollectionProps): ReactNode {
  const { lines, stats } = data
  if (lines.length === 0) return null
  const { collection } = data.content
  return (
    <HorizontalScroll
      header={
        <div className={`${HOME_CONTAINER} flex flex-wrap items-end justify-between gap-6`}>
          <div className="flex flex-col gap-[14px]">
            <Eyebrow>{collection.eyebrow}</Eyebrow>
            <Reveal kind="up" as="h2" className={HOME_SECTION_TITLE}>
              {collection.title}
            </Reveal>
          </div>
          <div
            aria-hidden="true"
            className="flex w-[240px] items-center gap-[14px] text-[12px] text-neutral-400 tabular-nums"
          >
            <span>01</span>
            <HorizontalScrollProgress />
            <span>{orderLabel(lines.length)}</span>
          </div>
        </div>
      }
    >
      {lines.map((line, index) => (
        <LineCard key={line.id} line={line} position={index + 1} />
      ))}
      <div className="relative h-[min(56vh,500px)] w-[min(60vw,300px)] flex-none">
        <Link
          href={asRoute('/tienda')}
          className="text-foreground flex size-full flex-col justify-end gap-3 rounded-[14px] bg-[radial-gradient(320px_260px_at_30%_20%,color-mix(in_srgb,var(--color-accent-800)_70%,transparent),transparent_70%)] p-6 no-underline shadow-[inset_0_0_0_1px_var(--color-neutral-800)]"
        >
          <Float className="mb-auto">
            <Image
              src="/brand/galpon-mark.png"
              alt=""
              width={58}
              height={77}
              className="h-auto w-[58px]"
            />
          </Float>
          <span className="text-[28px] leading-[1.1] tracking-[-0.02em]">
            {HOME_COPY.viewCatalog}
          </span>
          <span className="text-accent-300 inline-flex items-center gap-2 text-[13px]">
            {piecesLabel(stats.pieces)}
            <ArrowRightIcon size={14} aria-hidden="true" />
          </span>
        </Link>
      </div>
    </HorizontalScroll>
  )
}
