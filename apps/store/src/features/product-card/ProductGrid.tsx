'use client'

import type { RefObject, ReactNode } from 'react'
import { AnimatePresence, domAnimation, LazyMotion, m, useIsPresent } from 'motion/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import type { InstallmentsSetting } from '../../components/ui'
import { EASE_MAIN, usePrefersReducedMotion } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { countGridColumns, visibleProductLimit } from './grid-rows'
import { ProductCard } from './ProductCard'

/**
 * Grilla de tarjetas del diseño: tantas columnas de al menos 250 px como entren, con 20 px de
 * separación. La tienda, los relacionados de la ficha y los destacados del inicio usan la misma.
 */
export const PRODUCT_GRID_CLASS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-5'

/** Lo que tarda la grilla en crecer y cada tarjeta nueva en entrar, en segundos. */
const UNFOLD_DURATION_S = 0.6

/** Retardo entre una tarjeta nueva y la siguiente, en segundos. */
const UNFOLD_STAGGER_S = 0.05

/** Tarjetas nuevas que se escalonan (dos hileras de 5); las siguientes entran con la última. */
const MAX_UNFOLD_STAGGERED = 10

/** Cómo arranca cada tarjeta nueva: 16 px más arriba y transparente. */
const CARD_HIDDEN = { opacity: 0, y: -16 } as const

/** Cómo termina cada tarjeta nueva. */
const CARD_SHOWN = { opacity: 1, y: 0 } as const

/**
 * Anula la entrada propia de la tarjeta (el `Reveal up` de `ProductCard`: 28 px más abajo,
 * transparente y con desenfoque, que arranca recién cuando el observador la ve) en su hijo directo.
 * Los estilos en línea de Motion pierden contra `!important`, así que la tarjeta queda quieta y
 * visible desde el primer cuadro y la única entrada es la de esta grilla.
 */
const NO_OWN_REVEAL_CLASS = '*:transform-none! *:opacity-100! *:filter-none!'

/** Si la grilla está desplegada y para qué `collapseKey` lo está. */
interface MoreState {
  /** El `collapseKey` con que se desplegó (o se plegó). */
  key: string
  /** Si ya se tocó el botón. */
  expanded: boolean
}

/** Lo que recibe el marco de la grilla de arriba ({@link ProductGridProps.frame}). */
export interface ProductGridFrameProps {
  /** Clase de la grilla. */
  className: string
  /** Las tarjetas de las primeras hileras. */
  children: ReactNode
}

/** Props de {@link ProductGrid}. */
export interface ProductGridProps {
  /** Productos que se ven, ya filtrados y ordenados. */
  products: readonly ProductSummary[]
  /** Hileras completas antes del botón: tienda 4, relacionados 3, destacados 3. */
  rows: number
  /** Columnas que se suponen en el servidor y antes de medir. */
  defaultColumns: number
  /** Texto del botón (y nombre de la lista del `<noscript>`): `PRODUCT_CARD_COPY.moreProducts`. */
  moreLabel: string
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales". */
  showNetPrice: boolean
  /**
   * Al cambiar, la grilla vuelve a plegarse (tienda: filtro, orden y búsqueda). Sin él, se pliega
   * al montarse de nuevo (la ficha la dibuja con `key={slug}`).
   */
  collapseKey?: string
  /** Clase de las dos grillas (la de arriba y la que se despliega); por omisión {@link PRODUCT_GRID_CLASS}. */
  className?: string
  /**
   * Marco de la grilla de arriba (`GridReplay` en la tienda, `FeaturedExit` en el inicio): tiene
   * que dibujar la grilla como su primer elemento, con la clase que recibe. Por omisión, un `div`.
   */
  frame?: (props: ProductGridFrameProps) => ReactNode
  /** Cuántas de las primeras tarjetas cargan la foto con prioridad (entero ≥ 0). Por omisión 0. */
  priorityCount?: number
  /** `sizes` de las fotos, si no es el de la tarjeta. */
  sizes?: string
  /**
   * Solo pliega si la grilla mide hasta esta cantidad de columnas (entero ≥ 1); con más, muestra
   * todo y sin botón. Por omisión siempre pliega.
   */
  collapseMaxColumns?: number
}

/**
 * Valida que un número sea un entero mayor o igual a `min`.
 *
 * @throws {RangeError} Si no lo es.
 */
function assertWholeAtLeast(name: string, value: number, min: number): void {
  if (!Number.isInteger(value) || value < min) {
    throw new RangeError(
      `${name} tiene que ser un entero mayor o igual a ${String(min)} (llegó ${String(value)}).`,
    )
  }
}

/** El marco por omisión: la grilla en un `div`. */
function plainFrame({ className, children }: ProductGridFrameProps): ReactNode {
  return <div className={className}>{children}</div>
}

/**
 * Cuenta las columnas de la grilla que es el primer hijo del elemento de `hostRef`, cada vez que
 * cambia de ancho (`ResizeObserver` también avisa apenas empieza a observar).
 *
 * @returns La referencia para el contenedor de la grilla y las columnas medidas: `null` antes de
 *   medir o en un navegador sin `ResizeObserver`.
 */
function useGridColumns(): [RefObject<HTMLDivElement | null>, number | null] {
  const hostRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState<number | null>(null)
  useEffect(() => {
    const host = hostRef.current
    if (host === null || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => {
      const grid = host.firstElementChild
      if (!(grid instanceof HTMLElement)) return
      const measured = countGridColumns(window.getComputedStyle(grid).gridTemplateColumns)
      if (measured !== null) setColumns(measured)
    })
    observer.observe(host)
    return () => {
      observer.disconnect()
    }
  }, [])
  return [hostRef, columns]
}

/** Props de {@link UnfoldedCards}. */
interface UnfoldedCardsProps {
  /** Los productos que estaban debajo de las primeras hileras. */
  products: readonly ProductSummary[]
  /** Clase de la grilla (la misma que la de arriba). */
  className: string
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales". */
  showNetPrice: boolean
  /** `sizes` de las fotos. */
  sizes: string | undefined
}

/**
 * Las hileras que se desprenden al tocar el botón, en una grilla igual que sigue a la de arriba:
 * crece de alto (0 → `auto`) mientras cada tarjeta baja 16 px y aparece, escalonadas 0,05 s, en
 * 600 ms con la curva principal. Al montarse lleva el foco al link de la primera tarjeta (sin
 * desplazar: la grilla todavía mide 0 y recorta) y, al terminar de crecer, la acerca a la pantalla
 * si quedó afuera. Con menos movimiento aparecen de una.
 *
 * La entrada `up` propia de la tarjeta (sube 28 px y se funde recién cuando el observador la ve,
 * o sea durante el crecimiento) iría en contra de esta bajada y la retrasaría 1 s o más: la clase
 * {@link NO_OWN_REVEAL_CLASS} del contenedor de cada tarjeta nueva la deja quieta y visible, de modo
 * que solo cuenta la entrada de acá (0,6 s, escalonada 0,05 s).
 *
 * @param props - Ver {@link UnfoldedCardsProps}.
 */
function UnfoldedCards({
  products,
  className,
  installments,
  showNetPrice,
  sizes,
}: UnfoldedCardsProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const hostRef = useRef<HTMLDivElement>(null)
  const focused = useRef(false)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    if (focused.current) return
    focused.current = true
    hostRef.current?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: !reduced })
  }, [reduced])

  const settle = (): void => {
    setSettled(true)
    const link = hostRef.current?.querySelector<HTMLElement>('a[href]')
    if (link !== undefined && link !== null && document.activeElement === link) {
      link.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }

  const cards = products.map((product, index) => {
    const card = (
      <ProductCard
        product={product}
        installments={installments}
        showNetPrice={showNetPrice}
        index={index}
        sizes={sizes}
      />
    )
    return reduced ? (
      <div key={product.id}>{card}</div>
    ) : (
      <m.div
        key={product.id}
        className={NO_OWN_REVEAL_CLASS}
        initial={settled ? false : CARD_HIDDEN}
        animate={CARD_SHOWN}
        transition={{
          duration: UNFOLD_DURATION_S,
          delay: Math.min(index, MAX_UNFOLD_STAGGERED) * UNFOLD_STAGGER_S,
          ease: EASE_MAIN,
        }}
      >
        {card}
      </m.div>
    )
  })

  if (reduced) {
    return (
      <div ref={hostRef} className={`${className} pt-5`}>
        {cards}
      </div>
    )
  }
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        ref={hostRef}
        className={settled ? undefined : 'overflow-hidden'}
        initial={{ height: 0 }}
        animate={{ height: 'auto' }}
        transition={{ duration: UNFOLD_DURATION_S, ease: EASE_MAIN }}
        onAnimationComplete={settle}
      >
        <div className={`${className} pt-5`}>{cards}</div>
      </m.div>
    </LazyMotion>
  )
}

/** Props de {@link MoreButton}. */
interface MoreButtonProps {
  /** Texto del botón. */
  label: string
  /** Despliega el resto de los productos. */
  onMore: () => void
}

/**
 * El botón centrado que despliega el resto. Con movimiento va dentro de un `AnimatePresence`: al
 * tocarlo no desaparece de golpe (lo de abajo subiría ~90 px y volvería a bajar mientras crece la
 * grilla), sino que su lugar se achica a 0 y se funde en lo mismo que tarda la grilla nueva en
 * crecer, con la misma curva; mientras tanto queda inerte y oculto para los lectores. Con menos
 * movimiento va sin `AnimatePresence` y se va de una.
 *
 * @param props - Ver {@link MoreButtonProps}.
 */
function MoreButton({ label, onMore }: MoreButtonProps): ReactNode {
  const present = useIsPresent()
  return (
    <m.div
      data-more-leaving={present ? undefined : ''}
      aria-hidden={present ? undefined : true}
      inert={!present}
      className={present ? undefined : 'overflow-hidden'}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: UNFOLD_DURATION_S, ease: EASE_MAIN }}
    >
      <div className="flex justify-center pt-10">
        <Button variant="secondary" size="lg" onClick={onMore}>
          {label}
        </Button>
      </div>
    </m.div>
  )
}

/**
 * Grilla de tarjetas con `rows` hileras completas y, si hay más productos, el botón centrado
 * `moreLabel` que despliega el resto (ver `UnfoldedCards`). La usan la tienda (4 hileras), los
 * relacionados de la ficha (3) y los destacados del inicio (3, solo con una columna). Las hileras
 * salen de las columnas que entran, medidas en el cliente (`ResizeObserver` +
 * `grid-template-columns`); en el servidor y antes de medir se suponen `defaultColumns`. Con
 * `collapseMaxColumns`, solo se pliega si la grilla mide hasta esa cantidad de columnas. Al cambiar
 * `collapseKey` vuelve a plegarse.
 *
 * Al tocar el botón, su lugar se pliega mientras crece la grilla nueva (ver `MoreButton`). Los
 * productos de abajo no se dibujan hasta que se piden, pero sus links quedan en un `<noscript>`
 * para que se puedan rastrear y abrir sin JavaScript.
 *
 * @param props - Ver {@link ProductGridProps}.
 * @throws {RangeError} Si `rows`, `defaultColumns` o `collapseMaxColumns` no son enteros mayores o
 *   iguales a 1, o `priorityCount` no es un entero mayor o igual a 0.
 */
export function ProductGrid({
  products,
  rows,
  defaultColumns,
  moreLabel,
  installments,
  showNetPrice,
  collapseKey = '',
  className = PRODUCT_GRID_CLASS,
  frame = plainFrame,
  priorityCount = 0,
  sizes,
  collapseMaxColumns,
}: ProductGridProps): ReactNode {
  assertWholeAtLeast('Las hileras', rows, 1)
  assertWholeAtLeast('Las columnas por omisión', defaultColumns, 1)
  if (collapseMaxColumns !== undefined) {
    assertWholeAtLeast('El tope de columnas para plegar', collapseMaxColumns, 1)
  }
  assertWholeAtLeast('Las tarjetas con prioridad', priorityCount, 0)
  const [hostRef, columns] = useGridColumns()
  const reduced = usePrefersReducedMotion()
  const [more, setMore] = useState<MoreState>({ key: collapseKey, expanded: false })

  // Otro `collapseKey`: se vuelve a plegar. Se ajusta durante el render, sin efectos.
  let expanded = more.expanded
  if (more.key !== collapseKey) {
    expanded = false
    setMore({ key: collapseKey, expanded: false })
  }

  const measured = columns ?? defaultColumns
  const folds = collapseMaxColumns === undefined || measured <= collapseMaxColumns
  // Ya desplegada, el corte sigue a las columnas aunque la grilla se ensanche: así las tarjetas
  // nuevas no se vuelven a montar (ni a llevarse el foco) si después se angosta.
  const limit = folds || expanded ? visibleProductLimit(measured, rows) : products.length
  const first = products.slice(0, limit)
  const rest = products.slice(limit)

  const unfold = (): void => {
    setMore({ key: collapseKey, expanded: true })
  }
  const showButton = rest.length > 0 && !expanded
  const moreButton = showButton ? <MoreButton key="more" label={moreLabel} onMore={unfold} /> : null

  return (
    <>
      <div ref={hostRef}>
        {frame({
          className,
          children: first.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              installments={installments}
              showNetPrice={showNetPrice}
              index={index}
              priority={index < priorityCount}
              sizes={sizes}
            />
          )),
        })}
      </div>
      {rest.length > 0 && expanded ? (
        <UnfoldedCards
          products={rest}
          className={className}
          installments={installments}
          showNetPrice={showNetPrice}
          sizes={sizes}
        />
      ) : null}
      <LazyMotion features={domAnimation}>
        {reduced ? moreButton : <AnimatePresence initial={false}>{moreButton}</AnimatePresence>}
      </LazyMotion>
      {showButton ? (
        <noscript>
          <ul
            aria-label={moreLabel}
            className="mt-6 flex list-none flex-wrap justify-center gap-x-5 gap-y-2 p-0 text-[14px]"
          >
            {rest.map((product) => (
              <li key={product.id}>
                <Link href={asRoute(`/producto/${encodeURIComponent(product.slug)}`)}>
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
        </noscript>
      ) : null}
    </>
  )
}
