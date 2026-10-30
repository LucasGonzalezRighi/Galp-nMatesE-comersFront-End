'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/ArrowRight'
import { PlusIcon } from '@phosphor-icons/react/Plus'
import { StarIcon } from '@phosphor-icons/react/Star'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ProductSummary } from '@galpon/api-client'
import { formatRating, remainingQuantityFor } from '@galpon/domain'
import { FadeImage, Reveal, Tilt } from '../../components/motion'
import {
  IconButton,
  ImageWithPlaceholder,
  InstallmentsNote,
  type InstallmentsSetting,
  NetPrice,
  Price,
  Tag,
} from '../../components/ui'
import { buttonFxClassName } from '../../components/ui/Button'
import { ButtonFx } from '../../components/ui/ButtonFx'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { addProductToCart, clickOrigin, useCart } from '../cart'
import { PRODUCT_CARD_COPY } from './product-card.copy'

/** Cuántas tarjetas se escalonan al aparecer: de la novena en adelante entran juntas. */
const MAX_STAGGER_INDEX = 8

/** Retraso entre una tarjeta y la siguiente al aparecer, en milisegundos. */
const STAGGER_MS = 70

/** Fondo de la tarjeta: del `surface` teñido de cobre al `surface` liso. */
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

/** Brillo suave sobre la foto, centrado en el mouse. */
const GLOW_STYLE: CSSProperties = {
  background:
    'radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--color-accent-200) 26%, transparent), transparent 60%)',
  mixBlendMode: 'soft-light',
  opacity: 'var(--hov, 0)',
  transition: 'opacity .4s',
}

/**
 * Con el mouse encima o el foco del teclado adentro (el nombre o el "+"), la tarjeta sube 4 px con
 * una sombra más amplia (300 ms, curva principal). Con menos movimiento solo cambia la sombra.
 */
const ARTICLE_HOVER_CLASS =
  'ease-main transition-[translate,box-shadow] duration-300 group-hover/card:shadow-[0_0_0_1px_var(--color-neutral-700),0_22px_44px_-18px_rgba(0,0,0,.7)] group-has-focus-visible/card:shadow-[0_0_0_1px_var(--color-neutral-700),0_22px_44px_-18px_rgba(0,0,0,.7)] motion-safe:group-hover/card:-translate-y-1 motion-safe:group-has-focus-visible/card:-translate-y-1'

/** La foto se acerca a 1,04 en 600 ms con la curva principal. */
const IMAGE_ZOOM_CLASS =
  'ease-main absolute inset-0 transition-[scale] duration-600 motion-safe:group-hover/card:scale-[1.04] motion-safe:group-has-focus-visible/card:scale-[1.04]'

/**
 * La píldora "Ver detalle" sube desde abajo de la foto (550 ms) y se llena de gris de izquierda a
 * derecha con el texto en blanco (Ruling MR-16). Con menos movimiento aparece sin subir.
 */
const PILL_CLASS =
  'bg-background/70 relative isolate inline-flex translate-y-[150%] items-center gap-[6px] overflow-hidden rounded-full px-[13px] py-[7px] text-[12px] shadow-[0_0_0_1px_var(--color-neutral-700)] backdrop-blur-[10px] transition-[translate,color] duration-550 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/card:translate-y-0 group-hover/card:text-[#fff] group-has-focus-visible/card:translate-y-0 group-has-focus-visible/card:text-[#fff] motion-reduce:transition-none'

/** Banda gris de la píldora: entra en 1,5 s al pasar el mouse y se recoge en 0,5 s. */
const PILL_SWEEP_CLASS =
  'absolute inset-0 -z-10 bg-neutral-600 [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-[ease-out] group-hover/card:[clip-path:inset(0)] group-hover/card:duration-1500 group-hover/card:ease-[cubic-bezier(.4,.05,.25,1)] group-has-focus-visible/card:[clip-path:inset(0)] group-has-focus-visible/card:duration-1500 group-has-focus-visible/card:ease-[cubic-bezier(.4,.05,.25,1)] motion-reduce:transition-none'

/**
 * El "+" se llena de gris también con el hover de la tarjeta o el foco en el nombre (la banda de
 * `ButtonFx` ya responde al hover y al foco del propio botón).
 */
const ADD_SWEEP_CLASS =
  'group-hover/card:[clip-path:inset(0)] group-hover/card:duration-1500 group-hover/card:ease-[cubic-bezier(.4,.05,.25,1)] group-has-focus-visible/card:[clip-path:inset(0)] group-has-focus-visible/card:duration-1500 group-has-focus-visible/card:ease-[cubic-bezier(.4,.05,.25,1)]'

/** El "+" se pone blanco y su ícono gira 90° con el hover de la tarjeta o el foco adentro. */
const ADD_BUTTON_CLASS =
  'group-hover/card:border-(--btn-fill) group-hover/card:text-[#fff] group-has-focus-visible/card:border-(--btn-fill) group-has-focus-visible/card:text-[#fff]'

/** Giro del ícono "+". */
const ADD_ICON_CLASS =
  'ease-main transition-[rotate] duration-300 motion-safe:group-hover/card:rotate-90 motion-safe:group-has-focus-visible/card:rotate-90'

/**
 * El nombre subraya con un trazo de 1 px que crece desde la izquierda (300 ms) con el hover de la
 * tarjeta o el foco adentro.
 */
const NAME_LINK_CLASS =
  'text-foreground relative inline-block no-underline after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-[scale] after:duration-300 after:ease-main group-hover/card:after:scale-x-100 group-has-focus-visible/card:after:scale-x-100 motion-reduce:after:transition-none'

/** El texto de la tarjeta se despega 26 px de la tarjeta (efecto 3D al inclinarla). */
const BODY_STYLE: CSSProperties = { transform: 'translateZ(26px)' }

/** Props de {@link ProductCard}. */
export interface ProductCardProps {
  /** El producto, como lo devuelve el listado de la API. */
  product: ProductSummary
  /** Ajuste de cuotas de la tienda (`PublicSettings.installments`). */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales" (`PublicSettings.priceDisplay.showNetPrice`). */
  showNetPrice: boolean
  /** Lugar de la tarjeta en la grilla: escalona la aparición (70 ms por lugar, hasta el noveno). */
  index?: number
  /** Carga la foto con prioridad (las del primer pliegue). */
  priority?: boolean
  /** `sizes` de la foto, si la grilla no es la de cuatro columnas del catálogo. */
  sizes?: string
}

/**
 * Tarjeta de producto Vitrina (spec 9.5, `ProductCard.dc.html`): foto o marco punteado, línea,
 * nombre, estrella y promedio si hay reseñas, precio o "Consultar", leyenda de cuotas con CFT
 * (o "Precio a confirmar" sin precio), "Precio sin impuestos nacionales", etiquetas "Sin stock" y
 * "Consultar", la píldora "Ver detalle" y el botón de agregar rápido.
 *
 * Toda la tarjeta lleva a la ficha (`/producto/{slug}`); el nombre es el enlace para el teclado y
 * los lectores de pantalla. Agregar rápido usa Negro y Alpaca cincelada en los mates, respeta el
 * tope de compra (`remainingQuantityFor` de `@galpon/domain`, contando todas las líneas del
 * carrito: se deshabilita cuando ya está todo lo disponible), muestra el aviso y lanza el vuelo al
 * carrito. Con el mouse se inclina en 3D; con el mouse encima o el foco adentro sube 4 px, la foto
 * se acerca a 1,04, el nombre subraya desde la izquierda, la píldora se llena de gris y el "+" se
 * llena de gris con el ícono que gira 90°. La foto entra con un fundido al cargar (`FadeImage`).
 *
 * @param props - Ver {@link ProductCardProps}.
 * @example
 * <ProductCard product={product} installments={settings.installments} showNetPrice={settings.priceDisplay.showNetPrice} />
 */
export function ProductCard({
  product,
  installments,
  showNetPrice,
  index = 0,
  priority = false,
  sizes,
}: ProductCardProps): ReactNode {
  const router = useRouter()
  const { lines } = useCart()
  const href = asRoute(`/producto/${encodeURIComponent(product.slug)}`)
  const atCartLimit =
    product.isPurchasable && remainingQuantityFor(product.id, product.maxQuantity, lines) < 1
  const cannotBuy = !product.isPurchasable || atCartLimit
  const hasRating = product.rating.count > 0
  const noPrice = product.priceArs === null

  const open = (): void => {
    router.push(href)
  }
  const add = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation()
    addProductToCart({ product, origin: clickOrigin(event) })
  }

  return (
    <Reveal
      kind="up"
      delay={Math.min(index, MAX_STAGGER_INDEX) * STAGGER_MS}
      className="h-full min-w-0"
    >
      <Tilt className="h-full" style={{ transformStyle: 'preserve-3d' }}>
        {/* Clic con el mouse en cualquier parte; el teclado usa el enlace del nombre. */}
        <div
          role="presentation"
          data-product-card=""
          className="group/card h-full cursor-pointer transform-3d"
          onClick={open}
        >
          <article
            className={cx(
              'relative flex h-full flex-col rounded-[14px] shadow-sm transform-3d',
              ARTICLE_HOVER_CLASS,
            )}
            style={CARD_STYLE}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              style={RING_STYLE}
            />
            <div className="bg-background relative mx-2 mt-2 aspect-[4/5] overflow-hidden rounded-[10px]">
              <div data-card-zoom="" className={IMAGE_ZOOM_CLASS}>
                <FadeImage className="size-full">
                  <ImageWithPlaceholder
                    src={product.mainImage?.url}
                    alt={product.mainImage?.alt ?? product.name}
                    label={product.name}
                    sizes={sizes}
                    priority={priority}
                    className="size-full rounded-[10px]"
                  />
                </FadeImage>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={GLOW_STYLE}
              />
              <div className="pointer-events-none absolute top-[10px] left-[10px] flex gap-[6px]">
                {product.isSoldOut ? (
                  <Tag variant="neutral">{PRODUCT_CARD_COPY.soldOut}</Tag>
                ) : null}
                {noPrice ? <Tag variant="outline">{PRODUCT_CARD_COPY.consult}</Tag> : null}
              </div>
              <div className="pointer-events-none absolute right-[10px] bottom-[10px] left-[10px] flex justify-center">
                <span aria-hidden="true" className={PILL_CLASS}>
                  <span data-button-sweep="" className={PILL_SWEEP_CLASS} />
                  {PRODUCT_CARD_COPY.viewDetail}
                  <ArrowRightIcon size={12} aria-hidden="true" />
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-[6px] px-4 pt-[14px] pb-4" style={BODY_STYLE}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-accent text-[10.5px] tracking-[0.1em] uppercase">
                  {product.categoryName}
                </span>
                {hasRating ? (
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-neutral-400">
                    <span className="sr-only">{PRODUCT_CARD_COPY.rating}</span>
                    <StarIcon size={11} weight="fill" className="text-accent" aria-hidden="true" />
                    {formatRating(product.rating.average)}
                  </span>
                ) : null}
              </div>
              <h3 className="text-[16px] leading-[1.25] tracking-[-0.01em] text-pretty">
                <Link
                  href={href}
                  className={NAME_LINK_CLASS}
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                >
                  {product.name}
                </Link>
              </h3>
              <div className="mt-auto flex items-center justify-between gap-[10px] pt-2">
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <Price amount={product.priceArs} size="md" />
                  {noPrice ? (
                    <span className="text-[11px] text-neutral-500">
                      {PRODUCT_CARD_COPY.priceToConfirm}
                    </span>
                  ) : (
                    <>
                      <InstallmentsNote
                        price={product.priceArs}
                        installments={installments}
                        className="text-[11px]! text-neutral-400!"
                      />
                      {showNetPrice ? (
                        <NetPrice
                          amount={product.netPriceArs}
                          className="text-[11px]! text-neutral-500!"
                        />
                      ) : null}
                    </>
                  )}
                </div>
                <IconButton
                  variant="primary"
                  aria-label={PRODUCT_CARD_COPY.addToCart}
                  title={atCartLimit ? PRODUCT_CARD_COPY.cartLimit : undefined}
                  disabled={cannotBuy}
                  className={cx(
                    'flex-none rounded-full!',
                    !cannotBuy && buttonFxClassName('gray'),
                    !cannotBuy && ADD_BUTTON_CLASS,
                  )}
                  onClick={add}
                >
                  {cannotBuy ? null : (
                    <ButtonFx interactive={false} sweepClassName={ADD_SWEEP_CLASS} />
                  )}
                  <PlusIcon size={16} aria-hidden="true" className={ADD_ICON_CLASS} />
                </IconButton>
              </div>
            </div>
          </article>
        </div>
      </Tilt>
    </Reveal>
  )
}
