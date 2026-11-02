import type { CSSProperties, ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Image from 'next/image'
import Link from 'next/link'
import type { Category } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { Float, HorizontalScroll, Tilt } from '../../components/motion'
import { ImageWithPlaceholder } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { CollectionEntrance, EntranceCard, EntranceTitle } from './CollectionEntrance'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { HOME_COPY, linePhotoPlaceholder, piecesLabel } from './home.copy'

/**
 * Margen de la pista: el de `--site-inset` (`globals.css`), así la primera tarjeta arranca donde
 * arrancan el título y el contenido del contenedor, a cualquier ancho de pantalla.
 */
const TRACK_STYLE: CSSProperties = { padding: '0 var(--site-inset)' }

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

/**
 * Hover de la tarjeta de una línea (y su equivalente con el foco en el link): sube 4 px y el borde
 * pasa a cobre al 40 % en 240 ms; con menos movimiento solo cambia el borde.
 */
const CARD_HOVER_CLASS =
  'group/line ease-main transition-[translate,box-shadow] duration-240 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_40%,transparent)] has-focus-visible:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_40%,transparent)] motion-safe:hover:-translate-y-1 motion-safe:has-focus-visible:-translate-y-1'

/** La flecha de "Ver línea" se corre 4 px a la derecha con el hover o el foco de la tarjeta. */
const ARROW_HOVER_CLASS =
  'ease-main transition-[translate] duration-240 motion-safe:group-hover/line:translate-x-1 motion-safe:group-has-focus-visible/line:translate-x-1'

/** Props de {@link LineCard}. */
interface LineCardProps {
  /** La línea de producto. */
  line: Category
}

/** Tarjeta de una línea: foto, cantidad de piezas, nombre, descripción y "Ver línea" (sin número). */
function LineCard({ line }: LineCardProps): ReactNode {
  return (
    <Tilt
      className={`${CARD_SIZE} ${CARD_HOVER_CLASS} bg-surface has-focus-visible:outline-accent relative w-[min(78vw,440px)] cursor-pointer overflow-hidden rounded-[14px] shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2`}
    >
      <div aria-hidden="true" className="absolute -inset-[5%]" style={PHOTO_STYLE}>
        <ImageWithPlaceholder
          src={line.image?.url}
          alt=""
          label={linePhotoPlaceholder(line.name)}
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
      <div className="pointer-events-none absolute top-[18px] right-5 left-5 flex justify-end tabular-nums">
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
          <ArrowRightIcon size={14} className={ARROW_HOVER_CLASS} />
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
 * pasan de lado a lado con el scroll (sin rótulo ni números: Ruling MR-23) y, al final, la tarjeta
 * "Ver todo el catálogo · N piezas". Después del mate 3D sale de adentro del mate: la yerba en que
 * termina la zambullida se disuelve, el título sube con máscara y las tarjetas salen de la
 * profundidad una tras otra (`CollectionEntrance`, Ruling MR-22); sin el mate 3D entra con un
 * fundido. Con `prefers-reduced-motion: reduce` es una fila con scroll propio, quieta. No se dibuja
 * si no hay líneas con piezas.
 *
 * @param props - Ver {@link HomeCollectionProps}.
 */
export function HomeCollection({ data }: HomeCollectionProps): ReactNode {
  const { lines, stats } = data
  if (lines.length === 0) return null
  const { collection } = data.content
  return (
    <CollectionEntrance>
      <HorizontalScroll
        trackStyle={TRACK_STYLE}
        header={
          <div className={HOME_CONTAINER}>
            <EntranceTitle className={HOME_SECTION_TITLE}>{collection.title}</EntranceTitle>
          </div>
        }
      >
        {lines.map((line, index) => (
          <EntranceCard key={line.id} index={index}>
            <LineCard line={line} />
          </EntranceCard>
        ))}
        <EntranceCard index={lines.length}>
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
        </EntranceCard>
      </HorizontalScroll>
    </CollectionEntrance>
  )
}
