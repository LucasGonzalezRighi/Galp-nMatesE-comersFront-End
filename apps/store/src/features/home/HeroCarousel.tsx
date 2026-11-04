'use client'

import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus'
import Image from 'next/image'
import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import type { HomeContent, ProductSummary } from '@galpon/api-client'
import { remainingQuantityFor } from '@galpon/domain'
import { Magnetic, Reveal } from '../../components/motion'
import { Button, ImageWithPlaceholder, Price, Tag } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { addProductToCart, clickOrigin, useCart } from '../cart'
import { heroCounter, heroWord, stackLook } from './hero-carousel'
import { HOME_ARROW_SIZE, HOME_PILL_BUTTON } from './home-styles'
import {
  addProductLabel,
  HOME_COPY,
  heroSlideAnnouncement,
  heroViewLabel,
  stopCounter,
} from './home.copy'

/** Retardo de entrada de cada línea del título, en milisegundos (los 60 y 180 del v4). */
const TITLE_LINE_DELAYS_MS = [60, 180] as const

/** Cuánto hay que deslizar el dedo (o el mouse) sobre la pila para pasar de pieza, en píxeles. */
const SWIPE_PX = 50

/** Anchos de la foto de una tarjeta: 72 % de la columna en el celular y la tableta, 40 % en escritorio. */
const CARD_SIZES = '(max-width: 1023px) 72vw, 40vw'

/** Los microtextos de la portada del v4. */
const COPY = HOME_COPY.heroCarousel

/** Props de {@link HeroCarousel}. */
export interface HeroCarouselProps {
  /** Los textos editables de la portada (píldora, título y botones; la bajada no se muestra). */
  hero: HomeContent['hero']
  /** Las piezas, en orden (`heroSlides`). Sin piezas quedan el título y los botones. */
  slides: ProductSummary[]
  /** Descuento del kit para mostrar en su botón ("−10%"), o `null` si no tiene. */
  kitDiscountLabel: string | null
}

/** Dónde está una pieza respecto de la actual. */
interface SlideState {
  /** Es la actual. */
  current: boolean
  /** Es la que acaba de salir (la anterior): su tarjeta pasa por delante y su texto se va hacia arriba. */
  leaving: boolean
}

/**
 * Las variables de una tarjeta de la pila, con las dos tablas de `stackLook`: la plana (celular) y
 * la del v4 con giro (desde 768 px). `home.css` elige cuál usar con una media query, así el HTML del
 * servidor ya trae la pila bien armada a cualquier ancho y no hace falta medir la ventana.
 */
function cardVariables(distance: number, count: number): CSSProperties {
  const flat = stackLook(distance, count, true)
  const tilt = stackLook(distance, count, false)
  return {
    '--flat-x': `${String(flat.x)}%`,
    '--flat-y': `${String(flat.y)}%`,
    '--flat-scale': String(flat.scale),
    '--flat-alpha': String(flat.opacity),
    '--flat-z': String(flat.z),
    '--tilt-x': `${String(tilt.x)}%`,
    '--tilt-y': `${String(tilt.y)}%`,
    '--tilt-scale': String(tilt.scale),
    '--tilt-turn': `${String(tilt.rotateY)}deg`,
    '--tilt-alpha': String(tilt.opacity),
    '--tilt-z': String(tilt.z),
  } as CSSProperties
}

/** Atributos de una pieza que no es la actual: no se lee ni se puede tocar. */
function hiddenProps({ current }: SlideState): { 'aria-hidden'?: true; inert?: boolean } {
  return current ? {} : { 'aria-hidden': true, inert: true }
}

/** Atributos de datos que usa `home.css` para ubicar la pieza. */
function stateData({ current, leaving }: SlideState): Record<string, string | undefined> {
  return {
    'data-current': current ? '' : undefined,
    'data-leaving': leaving ? '' : undefined,
  }
}

/** Props de {@link AddButton}. */
interface AddButtonProps {
  /** La pieza. */
  product: ProductSummary
}

/**
 * "+ Agregar" de la pieza actual: la suma al carrito con el vuelo (en los mates con Negro y Alpaca
 * cincelada, como `addProductToCart`) y se deshabilita si no se puede comprar o si el carrito ya
 * tiene todo lo disponible (`remainingQuantityFor` de `@galpon/domain`).
 */
function AddButton({ product }: AddButtonProps): ReactNode {
  const { lines } = useCart()
  const atCartLimit =
    product.isPurchasable && remainingQuantityFor(product.id, product.maxQuantity, lines) < 1
  const add = (event: MouseEvent<HTMLButtonElement>): void => {
    addProductToCart({ product, origin: clickOrigin(event) })
  }
  return (
    <Button
      variant="secondary"
      fill="gray"
      aria-label={addProductLabel(product.name)}
      title={atCartLimit ? HOME_COPY.cartLimit : undefined}
      disabled={!product.isPurchasable || atCartLimit}
      className="min-h-10 gap-2! rounded-full! px-4!"
      onClick={add}
    >
      <PlusIcon size={15} aria-hidden="true" />
      {COPY.add}
    </Button>
  )
}

/** Props de {@link SlideInfo}. */
interface SlideInfoProps {
  /** La pieza. */
  product: ProductSummary
  /** Dónde está respecto de la actual. */
  state: SlideState
}

/**
 * El texto de una pieza (rubro, nombre, descripción desde 640 px, precio, "Agregar" y "Ver pieza").
 * Todas ocupan la misma celda: la actual entra subiendo 350 ms después de que arranca la pila.
 */
function SlideInfo({ product, state }: SlideInfoProps): ReactNode {
  return (
    <div
      {...hiddenProps(state)}
      {...stateData(state)}
      data-hero-info=""
      className="home-carousel-info flex flex-col gap-2 md:gap-[10px]"
    >
      <span className="text-accent-2-300 text-[11px] tracking-[0.16em] uppercase md:text-[12px]">
        {product.categoryName}
      </span>
      <h2 className="text-[24px] leading-[1.05] tracking-[-0.03em] md:text-[clamp(26px,2.6vw,36px)]">
        {product.name}
      </h2>
      <p className="line-clamp-2 max-w-[42ch] text-[15px] leading-[1.55] text-neutral-300 max-sm:hidden">
        {product.description}
      </p>
      <div className="mt-[6px] flex flex-wrap items-center gap-x-4 gap-y-2">
        <Price
          amount={product.priceArs}
          size="sm"
          className="text-[20px]! tracking-[-0.02em] md:text-[22px]!"
        />
        <AddButton product={product} />
        <Link
          href={asRoute(`/producto/${encodeURIComponent(product.slug)}`)}
          aria-label={heroViewLabel(product.name)}
          className="text-accent-300 hover:text-accent-2-300 inline-flex items-center gap-[6px] text-[14px] no-underline transition-colors"
        >
          {COPY.view}
          <ArrowRightIcon size={HOME_ARROW_SIZE} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

/** Props de {@link StackCard}. */
interface StackCardProps {
  /** La pieza. */
  product: ProductSummary
  /** Su posición, desde 0. */
  position: number
  /** Cantidad de piezas. */
  count: number
  /** Distancia a la actual (ver `stackLook`). */
  distance: number
  /** Dónde está respecto de la actual. */
  state: SlideState
}

/**
 * Una tarjeta de la pila: la foto (la actual se acerca despacio), el velo, el rubro y "01 / 05"
 * arriba, y el nombre y el precio abajo. Lo que muestra repite el texto de la pieza, así que es
 * decorativo; la actual suma un link a la ficha por encima.
 */
function StackCard({ product, position, count, distance, state }: StackCardProps): ReactNode {
  return (
    <article
      {...hiddenProps(state)}
      {...stateData(state)}
      data-hero-card=""
      style={cardVariables(distance, count)}
      className="home-carousel-card bg-surface absolute inset-y-0 left-0 w-[72%] overflow-hidden rounded-[16px] shadow-lg md:w-[76%] md:rounded-[18px]"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <div className="home-carousel-photo absolute inset-0">
          <ImageWithPlaceholder
            src={product.mainImage?.url}
            alt=""
            label={product.name}
            sizes={CARD_SIZES}
            priority={position === 0}
            className="size-full rounded-[inherit]"
          />
        </div>
        <div className="home-carousel-veil absolute inset-0" />
        <div className="absolute inset-x-5 top-[18px] flex items-center justify-between gap-3">
          <Tag variant="accent2">{product.categoryName}</Tag>
          <span className="text-[12px] text-neutral-200 tabular-nums md:text-[13px]">
            {stopCounter(position + 1, count)}
          </span>
        </div>
        <div className="absolute inset-x-5 bottom-[18px] flex items-end justify-between gap-3">
          <span className="text-[16px] tracking-[-0.02em] md:text-[18px]">{product.name}</span>
          <Price
            amount={product.priceArs}
            size="sm"
            className="text-accent-200 text-[14px]! whitespace-nowrap md:text-[15px]!"
          />
        </div>
      </div>
      {state.current ? (
        <Link
          href={asRoute(`/producto/${encodeURIComponent(product.slug)}`)}
          aria-label={product.name}
          draggable={false}
          className="absolute inset-0 rounded-[inherit]"
        />
      ) : null}
    </article>
  )
}

/**
 * La portada del inicio donde no hay mate 3D (Ruling IC-8: celular, tableta, ventanas bajas, menos
 * movimiento o contenido sin las dos escenas): el hero carrusel del v4. La píldora, el título
 * "Encontrá tu mate." (el único `h1` del inicio, que entra con CSS), el texto de la pieza actual,
 * las flechas con los puntos y el contador "01 — 05", los botones "Ver la tienda" y "Armá tu kit"
 * y la pila de tarjetas con la palabra gigante del grupo detrás.
 *
 * Sin avance solo: la pieza cambia con las flechas (dan la vuelta), los puntos o deslizando más de
 * 50 px sobre la pila. En el celular la pila va plana y entre el título y el texto (la foto entra
 * en la primera pantalla); desde 768 px es el layout del v4 con el giro. Las piezas que no son la
 * actual quedan `inert` y `aria-hidden`, escondidas con clases (nunca con estilos en línea), y con
 * menos movimiento todo cambia sin transición.
 *
 * @param props - Ver {@link HeroCarouselProps}.
 */
export function HeroCarousel({ hero, slides, kitDiscountLabel }: HeroCarouselProps): ReactNode {
  const [index, setIndex] = useState(0)
  const [touched, setTouched] = useState(false)
  const swipeStart = useRef<number | null>(null)
  const swiped = useRef(false)
  const stackId = useId()
  const count = slides.length
  const current = slides[index]

  const go = (next: number): void => {
    setIndex(((next % count) + count) % count)
    setTouched(true)
  }

  const slideState = (position: number): SlideState => ({
    current: position === index,
    leaving: count > 2 && (position - index + count) % count === count - 1,
  })

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    swipeStart.current = event.clientX
    swiped.current = false
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (swipeStart.current === null) return
    const delta = event.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(delta) <= SWIPE_PX) return
    swiped.current = true
    go(index + (delta < 0 ? 1 : -1))
  }

  const onPointerCancel = (): void => {
    swipeStart.current = null
  }

  // Si el mouse se arrastró sobre la tarjeta actual, soltarlo no abre la ficha.
  const onClickCapture = (event: MouseEvent<HTMLDivElement>): void => {
    if (!swiped.current) return
    swiped.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <section
      data-hero-carousel=""
      className="relative overflow-hidden md:flex md:min-h-[calc(100svh-64px)] md:items-center"
    >
      <div aria-hidden="true" className="home-carousel-bg pointer-events-none absolute inset-0" />
      <div className="site-container grid grid-cols-1 gap-3 pt-4 pb-12 md:gap-[26px] md:pt-14 md:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:grid-rows-[1fr_repeat(5,auto)_1fr] lg:gap-x-[clamp(32px,5vw,80px)]">
        <Reveal
          kind="up"
          className="bg-background/55 relative inline-flex items-center gap-[10px] justify-self-start rounded-full py-[6px] pr-4 pl-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-neutral-700)] lg:col-start-1 lg:row-start-2"
        >
          <span className="bg-accent-800 grid size-[26px] place-items-center rounded-full">
            <Image
              src="/brand/galpon-mark.png"
              alt=""
              width={13}
              height={17}
              className="h-auto w-[13px]"
            />
          </span>
          <span className="text-foreground">{HOME_COPY.brand}</span>
          <span aria-hidden="true" className="bg-accent-2-400 size-1 rounded-full" />
          <span className="text-neutral-400">{hero.eyebrow}</span>
        </Reveal>
        <h1 className="relative text-[clamp(46px,13vw,60px)] leading-[0.9] tracking-[-0.05em] whitespace-nowrap md:text-[clamp(48px,6.2vw,100px)] lg:col-start-1 lg:row-start-3">
          {hero.titleLines.map((line, position) => (
            <span key={`${String(position)}-${line}`} className="block overflow-hidden pb-[0.1em]">
              <span
                className={cx(
                  'home-rise block',
                  position > 0 &&
                    'from-accent-300 to-accent-2-300 bg-linear-to-r bg-clip-text text-transparent [text-shadow:none]',
                )}
                style={{ animationDelay: `${String(TITLE_LINE_DELAYS_MS[position] ?? 180)}ms` }}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>
        {current === undefined ? null : (
          <>
            {/* En el celular va entre el título y el texto; en la tableta, al final; desde 1024 px, a la derecha. */}
            <div className="max-md:relative md:order-last md:mt-[22px] lg:order-none lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:mt-0 lg:self-center">
              <span aria-hidden="true" data-hero-word="" className="home-carousel-word">
                {heroWord(current.group)}
              </span>
              <div className="home-carousel-reveal">
                <div
                  id={stackId}
                  role="group"
                  aria-label={COPY.stack}
                  data-hero-stack=""
                  className="relative h-[clamp(300px,39svh,380px)] touch-pan-y select-none md:h-[min(68vh,620px)] md:min-h-[420px] md:perspective-[1600px]"
                  onPointerDown={onPointerDown}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  onClickCapture={onClickCapture}
                >
                  {slides.map((product, position) => (
                    <StackCard
                      key={product.id}
                      product={product}
                      position={position}
                      count={count}
                      distance={(position - index + count) % count}
                      state={slideState(position)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Reveal kind="up" delay={240} className="relative grid lg:col-start-1 lg:row-start-4">
              {slides.map((product, position) => (
                <SlideInfo key={product.id} product={product} state={slideState(position)} />
              ))}
            </Reveal>
            {count > 1 ? (
              <Reveal
                kind="up"
                delay={320}
                className="relative flex items-center gap-3 md:gap-[18px] lg:col-start-1 lg:row-start-5"
              >
                <button
                  type="button"
                  aria-label={COPY.previous}
                  aria-controls={stackId}
                  className="home-carousel-arrow"
                  data-direction="previous"
                  onClick={() => {
                    go(index - 1)
                  }}
                >
                  <ArrowLeftIcon size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={COPY.next}
                  aria-controls={stackId}
                  className="home-carousel-arrow"
                  data-direction="next"
                  onClick={() => {
                    go(index + 1)
                  }}
                >
                  <ArrowRightIcon size={HOME_ARROW_SIZE} aria-hidden="true" />
                </button>
                <div
                  role="group"
                  aria-label={COPY.dots}
                  className="ml-[6px] flex items-center gap-[6px] md:gap-2"
                >
                  {slides.map((product, position) => (
                    <button
                      key={product.id}
                      type="button"
                      aria-label={product.name}
                      aria-current={position === index ? 'true' : undefined}
                      aria-controls={stackId}
                      className="home-carousel-dot"
                      onClick={() => {
                        go(position)
                      }}
                    />
                  ))}
                </div>
                <span
                  aria-hidden="true"
                  className="ml-auto text-[12px] text-neutral-400 tabular-nums md:text-[13px]"
                >
                  {heroCounter(index, count)}
                </span>
                <p aria-live="polite" className="sr-only">
                  {touched ? heroSlideAnnouncement(current.name, index + 1, count) : ''}
                </p>
              </Reveal>
            ) : null}
          </>
        )}
        <Reveal
          kind="up"
          delay={400}
          className="relative flex flex-wrap gap-3 md:mt-[6px] md:gap-[14px] lg:col-start-1 lg:row-start-6"
        >
          <Magnetic fullWidth className="max-md:flex-[1_1_150px]">
            <Button
              asChild
              variant="primary"
              size="lg"
              className={cx(HOME_PILL_BUTTON, 'w-full whitespace-nowrap max-md:px-4!')}
            >
              <Link href={asRoute('/tienda')}>
                {hero.primaryCtaLabel}
                <ArrowRightIcon size={HOME_ARROW_SIZE} aria-hidden="true" />
              </Link>
            </Button>
          </Magnetic>
          <Magnetic fullWidth className="max-md:flex-[1_1_150px]">
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="w-full rounded-full! px-5! whitespace-nowrap max-md:px-4!"
            >
              <Link href={asRoute('/kit')}>
                {hero.secondaryCtaLabel}
                {kitDiscountLabel === null ? null : <Tag variant="accent2">{kitDiscountLabel}</Tag>}
              </Link>
            </Button>
          </Magnetic>
        </Reveal>
      </div>
    </section>
  )
}
