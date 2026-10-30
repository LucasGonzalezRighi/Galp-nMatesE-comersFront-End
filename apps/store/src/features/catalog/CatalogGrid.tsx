'use client'

import type { RefObject, ReactNode } from 'react'
import { domAnimation, LazyMotion, m } from 'motion/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import type { InstallmentsSetting } from '../../components/ui'
import { EASE_MAIN, GridReplay, usePrefersReducedMotion } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { ProductCard } from '../product-card'
import { CATALOG_DEFAULT_COLUMNS, countGridColumns, visibleProductLimit } from './catalog-rows'
import { CATALOG_COPY } from './catalog.copy'

/** Cuántas tarjetas se cargan con prioridad: la primera fila de la grilla de cuatro columnas. */
const PRIORITY_CARDS = 4

/** Grilla del diseño: tantas columnas de al menos 250 px como entren, con 20 px de separación. */
const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-5'

/** Lo que tarda la grilla en crecer y cada tarjeta nueva en entrar, en segundos. */
const UNFOLD_DURATION_S = 0.6

/** Retardo entre una tarjeta nueva y la siguiente, en segundos. */
const UNFOLD_STAGGER_S = 0.05

/** Tarjetas nuevas que se escalonan (dos hileras de 6); las siguientes entran con la última. */
const MAX_UNFOLD_STAGGERED = 12

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

/** Si la grilla está desplegada y para qué filtro, orden y búsqueda (`collapseKey`) lo está. */
interface MoreState {
  /** El `collapseKey` con que se desplegó (o se plegó). */
  key: string
  /** Si ya se tocó "Más productos". */
  expanded: boolean
}

/** Props de {@link CatalogGrid}. */
export interface CatalogGridProps {
  /** Productos que se ven, ya filtrados y ordenados. Al menos uno. */
  products: readonly ProductSummary[]
  /** Identifica el filtro y el orden: al cambiar, las tarjetas reaparecen escalonadas. */
  replayKey: string
  /** Identifica el filtro, el orden y la búsqueda: al cambiar, la grilla vuelve a 4 hileras. */
  collapseKey: string
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales". */
  showNetPrice: boolean
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
  /** Los productos que estaban debajo de las 4 hileras. */
  products: readonly ProductSummary[]
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
  /** Si se muestra "Precio sin impuestos nacionales". */
  showNetPrice: boolean
}

/**
 * Las hileras que se desprenden al tocar "Más productos", en una grilla igual que sigue a la de
 * arriba: crece de alto (0 → `auto`) mientras cada tarjeta baja 16 px y aparece, escalonadas
 * 0,05 s, en 600 ms con la curva principal. Al montarse lleva el foco al link de la primera
 * tarjeta (sin desplazar: la grilla todavía mide 0 y recorta) y, al terminar de crecer, la acerca
 * a la pantalla si quedó afuera. Con menos movimiento aparecen de una.
 *
 * La entrada `up` propia de la tarjeta (sube 28 px y se funde recién cuando el observador la ve,
 * o sea durante el crecimiento) iría en contra de esta bajada y la retrasaría 1 s o más: la clase
 * {@link NO_OWN_REVEAL_CLASS} del contenedor de cada tarjeta nueva la deja quieta y visible, de modo
 * que solo cuenta la entrada de acá (0,6 s, escalonada 0,05 s).
 *
 * @param props - Ver {@link UnfoldedCardsProps}.
 */
function UnfoldedCards({ products, installments, showNetPrice }: UnfoldedCardsProps): ReactNode {
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
      <div ref={hostRef} className={`${GRID_CLASS} pt-5`}>
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
        <div className={`${GRID_CLASS} pt-5`}>{cards}</div>
      </m.div>
    </LazyMotion>
  )
}

/**
 * Grilla de la tienda con 4 hileras completas y, si hay más productos, el botón centrado "Más
 * productos" que despliega el resto (ver `UnfoldedCards`). Las hileras salen de las columnas que
 * entran, medidas en el cliente (`ResizeObserver` + `grid-template-columns`); en el servidor y
 * antes de medir se suponen 6 (24 productos). Al cambiar de filtro, orden o búsqueda
 * (`collapseKey`) vuelve a 4 hileras.
 *
 * Los productos de abajo no se dibujan hasta que se piden, pero sus links quedan en un
 * `<noscript>` para que se puedan rastrear y abrir sin JavaScript.
 *
 * @param props - Ver {@link CatalogGridProps}.
 */
export function CatalogGrid({
  products,
  replayKey,
  collapseKey,
  installments,
  showNetPrice,
}: CatalogGridProps): ReactNode {
  const [hostRef, columns] = useGridColumns()
  const [more, setMore] = useState<MoreState>({ key: collapseKey, expanded: false })

  // Otro filtro, orden o búsqueda: se vuelve a plegar. Se ajusta durante el render, sin efectos.
  let expanded = more.expanded
  if (more.key !== collapseKey) {
    expanded = false
    setMore({ key: collapseKey, expanded: false })
  }

  const limit = visibleProductLimit(columns ?? CATALOG_DEFAULT_COLUMNS)
  const first = products.slice(0, limit)
  const rest = products.slice(limit)

  let below: ReactNode = null
  if (rest.length > 0 && expanded) {
    below = (
      <UnfoldedCards products={rest} installments={installments} showNetPrice={showNetPrice} />
    )
  } else if (rest.length > 0) {
    below = (
      <>
        <div className="mt-10 flex justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setMore({ key: collapseKey, expanded: true })
            }}
          >
            {CATALOG_COPY.moreProducts}
          </Button>
        </div>
        <noscript>
          <ul
            aria-label={CATALOG_COPY.moreProducts}
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
      </>
    )
  }

  return (
    <>
      <div ref={hostRef}>
        <GridReplay replayKey={replayKey} className={GRID_CLASS}>
          {first.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              installments={installments}
              showNetPrice={showNetPrice}
              index={index}
              priority={index < PRIORITY_CARDS}
            />
          ))}
        </GridReplay>
      </div>
      {below}
    </>
  )
}
