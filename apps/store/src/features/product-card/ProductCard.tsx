'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/ArrowRight'
import { PlusIcon } from '@phosphor-icons/react/Plus'
import { StarIcon } from '@phosphor-icons/react/Star'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ProductSummary } from '@galpon/api-client'
import { formatRating, remainingQuantityFor } from '@galpon/domain'
import { Reveal, Tilt } from '../../components/motion'
import {
  IconButton,
  ImageWithPlaceholder,
  InstallmentsNote,
  type InstallmentsSetting,
  NetPrice,
  Price,
  Tag,
} from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { addProductToCart, clickOrigin, useCart } from '../cart'
import { PRODUCT_CARD_COPY } from './product-card.copy'

/** Curva del diseño para el zoom de la foto y la píldora. */
const CARD_EASE = 'cubic-bezier(.2,.8,.2,1)'

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

/** La foto crece un 7 % al pasar el mouse. */
const IMAGE_ZOOM_STYLE: CSSProperties = {
  transform: 'scale(calc(1 + var(--hov, 0) * .07))',
  transition: `transform .9s ${CARD_EASE}`,
}

/** La píldora "Ver detalle" sube desde abajo de la foto al pasar el mouse. */
const PILL_STYLE: CSSProperties = {
  transform: 'translateY(calc((1 - var(--hov, 0)) * 150%))',
  transition: `transform .55s ${CARD_EASE}`,
}

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
 * Tarjeta de producto Vitrina (spec 9.5, `ProductCard.dc.html`): foto o silueta de mate, línea,
 * nombre, estrella y promedio si hay reseñas, precio o "Consultar", leyenda de cuotas con CFT
 * (o "Precio a confirmar" sin precio), "Precio sin impuestos nacionales", etiquetas "Sin stock" y
 * "Consultar", la píldora "Ver detalle" y el botón de agregar rápido.
 *
 * Toda la tarjeta lleva a la ficha (`/producto/{slug}`); el nombre es el enlace para el teclado y
 * los lectores de pantalla. Agregar rápido usa Negro y Alpaca cincelada en los mates, respeta el
 * tope de compra (`remainingQuantityFor` de `@galpon/domain`, contando todas las líneas del
 * carrito: se deshabilita cuando ya está todo lo disponible), muestra el aviso y lanza el vuelo al
 * carrito. Con el mouse se inclina en 3D y la foto se acerca.
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
        <div role="presentation" className="h-full cursor-pointer transform-3d" onClick={open}>
          <article
            className="relative flex h-full flex-col rounded-[14px] shadow-sm transform-3d"
            style={CARD_STYLE}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit]"
              style={RING_STYLE}
            />
            <div className="bg-background relative mx-2 mt-2 aspect-[4/5] overflow-hidden rounded-[10px]">
              <div className="absolute inset-0" style={IMAGE_ZOOM_STYLE}>
                <ImageWithPlaceholder
                  src={product.mainImage?.url}
                  alt={product.mainImage?.alt ?? product.name}
                  sizes={sizes}
                  priority={priority}
                  className="size-full"
                />
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
                <span
                  aria-hidden="true"
                  className="bg-background/70 inline-flex items-center gap-[6px] rounded-full px-[13px] py-[7px] text-[12px] shadow-[0_0_0_1px_var(--color-neutral-700)] backdrop-blur-[10px]"
                  style={PILL_STYLE}
                >
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
                  className="text-foreground no-underline"
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
                  className="flex-none rounded-full!"
                  onClick={add}
                >
                  <PlusIcon size={16} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </article>
        </div>
      </Tilt>
    </Reveal>
  )
}
