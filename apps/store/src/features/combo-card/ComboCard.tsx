'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { HandbagIcon } from '@phosphor-icons/react/Handbag'
import { PlusIcon } from '@phosphor-icons/react/Plus'
import Link from 'next/link'
import { useId, useState } from 'react'
import type { Combo, ComboItem } from '@galpon/api-client'
import type { Ferrule, Leather } from '@galpon/domain'
import {
  DEFAULT_FERRULE,
  DEFAULT_LEATHER,
  FERRULES,
  formatPesos,
  LEATHERS,
  pesos,
  remainingQuantityFor,
} from '@galpon/domain'
import { FadeImage, Magnetic, Reveal, Tilt } from '../../components/motion'
import {
  Button,
  ImageWithPlaceholder,
  InstallmentsNote,
  type InstallmentsSetting,
  NetPrice,
  Price,
  Segmented,
  Swatch,
  Tag,
} from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { addComboToCart, clickOrigin, useCart } from '../cart'
import {
  addComboLabel,
  COMBO_CARD_COPY,
  FERRULE_SHORT,
  ferruleGroupLabel,
  leatherGroupLabel,
  piecesLabel,
  savingsLabel,
  soldOutComboLabel,
} from './combo-card.copy'

/** Cuántas tarjetas se escalonan al aparecer: de la novena en adelante entran juntas. */
const MAX_STAGGER_INDEX = 8

/** Retraso entre una tarjeta y la siguiente al aparecer, en milisegundos. */
const STAGGER_MS = 70

/** Fondo de la tarjeta: del `surface` teñido de cobre al `surface` liso (el de `ProductCard`). */
const CARD_STYLE: CSSProperties = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 86%, var(--color-accent-900)), var(--color-surface) 60%)',
}

/** Borde de luz que sigue al mouse: un anillo de 1 px (máscara) con un degradé radial de cobre. */
const RING_STYLE: CSSProperties = {
  padding: 1,
  background:
    'radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), var(--color-accent-400), transparent 70%)',
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  maskComposite: 'exclude',
  opacity: 'var(--hov, 0)',
  transition: 'opacity .4s',
}

/** Velo de arriba de las fotos, para que se lea la cantidad de piezas. */
const SHADE_STYLE: CSSProperties = {
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--color-background) 40%, transparent), transparent 28%)',
}

/** Línea fina con los extremos desvanecidos entre las opciones y el precio (la de `KitSummary`). */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/**
 * Con el mouse encima o el foco del teclado adentro, la tarjeta sube 4 px con una sombra más
 * amplia (300 ms, curva principal). Con menos movimiento solo cambia la sombra.
 */
const ARTICLE_HOVER_CLASS =
  'ease-main transition-[translate,box-shadow] duration-300 group-hover/combo:shadow-[0_0_0_1px_var(--color-neutral-700),0_22px_44px_-18px_rgba(0,0,0,.7)] group-has-focus-visible/combo:shadow-[0_0_0_1px_var(--color-neutral-700),0_22px_44px_-18px_rgba(0,0,0,.7)] motion-safe:group-hover/combo:-translate-y-1 motion-safe:group-has-focus-visible/combo:-translate-y-1'

/** Cada foto se acerca a 1,04 en 600 ms, una tras otra (ver {@link ZOOM_DELAY_CLASS}). */
const IMAGE_ZOOM_CLASS =
  'ease-main absolute inset-0 transition-[scale] duration-600 motion-safe:group-hover/combo:scale-[1.04] motion-safe:group-has-focus-visible/combo:scale-[1.04]'

/** Retraso del acercamiento de cada foto, en orden. */
const ZOOM_DELAY_CLASS = ['delay-0', 'delay-60', 'delay-120'] as const

/** El "+" entre las fotos gira 90° con el hover o el foco de la tarjeta (sigue siendo un "+"). */
const PLUS_CLASS =
  'bg-background/80 text-accent-300 ease-main grid size-[28px] place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--color-neutral-700)] backdrop-blur-[8px] transition-[rotate] duration-300 motion-safe:group-hover/combo:rotate-90 motion-safe:group-has-focus-visible/combo:rotate-90'

/** El nombre de una pieza subraya con un trazo que crece desde la izquierda con su hover o foco. */
const PIECE_LINK_CLASS =
  'relative min-w-0 truncate text-neutral-200 no-underline after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-[scale] after:duration-300 after:ease-main hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none'

/** Clases de las columnas de fotos según la cantidad de piezas. */
const COLUMNS_CLASS: Readonly<Record<number, string>> = { 2: 'grid-cols-2', 3: 'grid-cols-3' }

/** Props de {@link ComboCard}. */
export interface ComboCardProps {
  /** El combo, como lo devuelve `GET /combos`. */
  combo: Combo
  /** Ajuste de cuotas de la tienda (`PublicSettings.installments`). */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales" (`PublicSettings.priceDisplay.showNetPrice`). */
  showNetPrice: boolean
  /** Lugar de la tarjeta en la grilla: escalona la aparición (70 ms por lugar, hasta el noveno). */
  index?: number
  /**
   * Si la tarjeta aparece sola al llegar a ella (en una grilla). En un carrusel va `false`: las
   * tarjetas que quedan fuera de la fila no entran en pantalla y aparecerían recién al deslizarlas.
   * Por defecto `true`.
   */
  entrance?: boolean
}

/** Si una pieza no se puede vender ahora (sin stock o fuera de venta). */
function isPieceOut(item: ComboItem): boolean {
  return item.maxQuantity === 0 || !item.isPurchasable
}

/** Props de {@link ComboPieces}. */
interface ComboPiecesProps {
  /** Las piezas, de 2 a 3. */
  items: readonly ComboItem[]
  /** Si el combo no se puede comprar: lleva la etiqueta "Sin stock". */
  soldOut: boolean
}

/** Las fotos de las piezas en fila, con un "+" en cada unión, la etiqueta de stock y la cantidad. */
function ComboPieces({ items, soldOut }: ComboPiecesProps): ReactNode {
  const count = items.length
  return (
    <div className="bg-background relative mx-2 mt-2 h-[clamp(220px,19vw,300px)] overflow-hidden rounded-[10px]">
      <div className={cx('grid h-full gap-[6px]', COLUMNS_CLASS[count] ?? 'grid-cols-3')}>
        {items.map((item, position) => (
          <div
            key={item.productId}
            data-combo-piece=""
            className={cx(
              'bg-surface relative overflow-hidden rounded-md',
              isPieceOut(item) && 'brightness-[.7] saturate-[.6]',
            )}
          >
            <div className={cx(IMAGE_ZOOM_CLASS, ZOOM_DELAY_CLASS[position])}>
              <FadeImage className="size-full">
                <ImageWithPlaceholder
                  src={item.image?.url}
                  alt={item.image?.alt ?? item.name}
                  label={item.name}
                  sizes="(min-width: 768px) 15vw, 45vw"
                  className="size-full rounded-md [&_img]:object-[50%_45%]"
                />
              </FadeImage>
            </div>
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={SHADE_STYLE}
      />
      {items.slice(1).map((item, position) => (
        <span
          key={item.productId}
          aria-hidden="true"
          data-combo-plus=""
          className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${String((100 * (position + 1)) / count)}%` }}
        >
          <span className={PLUS_CLASS}>
            <PlusIcon size={13} />
          </span>
        </span>
      ))}
      <div className="pointer-events-none absolute top-[10px] right-[10px] left-[10px] flex items-start justify-between gap-2">
        {soldOut ? <Tag variant="neutral">{COMBO_CARD_COPY.soldOut}</Tag> : <span />}
        <span className="text-[12px] text-neutral-200 tabular-nums">{piecesLabel(count)}</span>
      </div>
    </div>
  )
}

/** Título de una opción del mate con el valor elegido a la derecha (como la ficha). */
function OptionHeading({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <span className="text-neutral-400">{label}</span>
      <span>{value}</span>
    </div>
  )
}

/** Props de {@link MateOptions}. */
interface MateOptionsProps {
  /** Nombre del mate del combo: hace únicos los nombres de los grupos. */
  mateName: string
  /** Cuero elegido. */
  leather: Leather
  /** Virola elegida. */
  ferrule: Ferrule
  /** Si las opciones están deshabilitadas (combo sin stock). */
  disabled: boolean
  /** Se llama con el cuero elegido. */
  onLeather: (leather: Leather) => void
  /** Se llama con la virola elegida. */
  onFerrule: (ferrule: Ferrule) => void
}

/** Cuero (círculos de color) y virola (control segmentado con nombres cortos) del mate del combo. */
function MateOptions({
  mateName,
  leather,
  ferrule,
  disabled,
  onLeather,
  onFerrule,
}: MateOptionsProps): ReactNode {
  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-col gap-2">
        <OptionHeading label={COMBO_CARD_COPY.leather} value={leather} />
        <span role="group" aria-label={leatherGroupLabel(mateName)} className="flex gap-2">
          {LEATHERS.map((option) => (
            <Swatch
              key={option}
              leather={option}
              size="sm"
              selected={option === leather}
              disabled={disabled}
              className="disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:size-[28px]"
              onClick={() => {
                onLeather(option)
              }}
            />
          ))}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <OptionHeading label={COMBO_CARD_COPY.ferrule} value={ferrule} />
        <Segmented
          label={ferruleGroupLabel(mateName)}
          options={FERRULES.map((option) => ({
            value: option,
            label: FERRULE_SHORT[option],
            disabled,
          }))}
          value={ferrule}
          onChange={onFerrule}
          className="self-start text-[12.5px]"
        />
      </div>
    </div>
  )
}

/**
 * Tarjeta de combo (Ruling IC-12, `research-design.md` §4–§8): las fotos de las piezas en fila con
 * un "+" en cada unión, "Combo", el nombre, cada pieza con el link a su ficha y su precio suelto,
 * el cuero y la virola del mate (solo si el combo lleva mate; arrancan en Negro y Alpaca
 * cincelada), el precio final con el de lista tachado y el chip verde "Ahorrás $X" (solo si hay
 * ahorro), las cuotas, el precio sin impuestos si el ajuste está activo, y el botón "Agregar combo"
 * a todo el ancho con el efecto gris del carrito.
 *
 * No es un link (no hay página de combo). Agregar usa `addComboToCart`: respeta el tope de cada
 * pieza contando todas las líneas del carrito (se deshabilita y explica por qué cuando ya está todo
 * lo disponible), avisa y lanza el vuelo, sin abrir el carrito. Un combo que no se puede comprar
 * muestra "Sin stock" sobre las fotos y en el botón, apaga la pieza agotada y deshabilita las
 * opciones. Con el mouse encima o el foco adentro la tarjeta sube 4 px, se prende el borde de luz,
 * las fotos se acercan una tras otra y los "+" giran (todo con `motion-safe`).
 *
 * @param props - Ver {@link ComboCardProps}.
 * @example
 * <ComboCard combo={combo} installments={settings.installments} showNetPrice={false} />
 */
export function ComboCard({
  combo,
  installments,
  showNetPrice,
  index = 0,
  entrance = true,
}: ComboCardProps): ReactNode {
  const titleId = useId()
  const { lines } = useCart()
  const [leather, setLeather] = useState<Leather>(DEFAULT_LEATHER)
  const [ferrule, setFerrule] = useState<Ferrule>(DEFAULT_FERRULE)
  const mate = combo.items.find((item) => item.group === 'mate')
  const soldOut = !combo.isPurchasable
  const atCartLimit =
    combo.isPurchasable &&
    combo.items.some((item) => remainingQuantityFor(item.productId, item.maxQuantity, lines) < 1)
  const showSavings =
    combo.savingsArs > 0 && combo.items.every((item) => item.unitPriceArs !== null)

  const add = (event: MouseEvent<HTMLButtonElement>): void => {
    addComboToCart({
      combo,
      ...(mate === undefined ? {} : { options: { leather, ferrule } }),
      origin: clickOrigin(event),
    })
  }

  const body = (
    <Tilt max={0} className="h-full">
      <div className="group/combo h-full">
        <article
          aria-labelledby={titleId}
          className={cx(
            'relative flex h-full flex-col rounded-[14px] shadow-sm',
            ARTICLE_HOVER_CLASS,
          )}
          style={CARD_STYLE}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={RING_STYLE}
          />
          <ComboPieces items={combo.items} soldOut={soldOut} />
          <div className="flex flex-1 flex-col gap-[10px] px-4 pt-[14px] pb-4">
            <span className="text-accent text-[10.5px] tracking-[0.1em] uppercase">
              {COMBO_CARD_COPY.eyebrow}
            </span>
            <h3
              id={titleId}
              className="text-[clamp(18px,1.4vw,21px)] leading-[1.2] tracking-[-0.015em] text-pretty"
            >
              {combo.name}
            </h3>
            <ul
              aria-label={COMBO_CARD_COPY.piecesList}
              className="m-0 flex list-none flex-col gap-[6px] p-0"
            >
              {combo.items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-baseline justify-between gap-3 text-[13.5px]"
                >
                  <Link
                    href={asRoute(`/producto/${encodeURIComponent(item.slug)}`)}
                    className={PIECE_LINK_CLASS}
                  >
                    {item.name}
                  </Link>
                  <span className="flex-none text-[12.5px] text-neutral-500 tabular-nums">
                    {isPieceOut(item) || item.unitPriceArs === null
                      ? COMBO_CARD_COPY.soldOut
                      : formatPesos(pesos(item.unitPriceArs))}
                  </span>
                </li>
              ))}
            </ul>
            {mate === undefined ? null : (
              <MateOptions
                mateName={mate.name}
                leather={leather}
                ferrule={ferrule}
                disabled={soldOut}
                onLeather={setLeather}
                onFerrule={setFerrule}
              />
            )}
            <div aria-hidden="true" className="mt-auto h-px" style={DIVIDER_STYLE} />
            <div className="flex flex-col gap-[6px]">
              <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-1">
                <span className="sr-only">{COMBO_CARD_COPY.comboPrice}</span>
                <Price
                  amount={combo.priceArs}
                  size="lg"
                  className="text-[clamp(26px,2.1vw,30px)]! tracking-[-0.02em]"
                />
                {showSavings ? (
                  <>
                    <span className="sr-only">{COMBO_CARD_COPY.listPrice}</span>
                    <s className="text-[13.5px] text-neutral-500 tabular-nums">
                      {formatPesos(pesos(combo.listPriceArs))}
                    </s>
                    <Tag variant="accent2">{savingsLabel(combo.savingsArs)}</Tag>
                  </>
                ) : null}
              </div>
              <InstallmentsNote
                price={combo.priceArs}
                installments={installments}
                className="text-[11px]! text-neutral-400!"
              />
              {showNetPrice ? (
                <NetPrice amount={combo.netPriceArs} className="text-[11px]! text-neutral-500!" />
              ) : null}
            </div>
            <div className="pt-2">
              <Magnetic strength={0.15} reach={8} fullWidth>
                <Button
                  size="lg"
                  fill="gray"
                  fullWidth
                  disabled={soldOut || atCartLimit}
                  title={atCartLimit ? COMBO_CARD_COPY.cartLimit : undefined}
                  aria-label={soldOut ? soldOutComboLabel(combo.name) : addComboLabel(combo.name)}
                  className="shadow-[0_0_30px_-10px_var(--color-accent)]"
                  onClick={add}
                >
                  <HandbagIcon size={18} aria-hidden="true" />
                  {soldOut ? COMBO_CARD_COPY.soldOut : COMBO_CARD_COPY.add}
                </Button>
              </Magnetic>
            </div>
          </div>
        </article>
      </div>
    </Tilt>
  )

  if (!entrance) return <div className="h-full min-w-0">{body}</div>
  return (
    <Reveal
      kind="up"
      delay={Math.min(index, MAX_STAGGER_INDEX) * STAGGER_MS}
      className="h-full min-w-0"
    >
      {body}
    </Reveal>
  )
}
