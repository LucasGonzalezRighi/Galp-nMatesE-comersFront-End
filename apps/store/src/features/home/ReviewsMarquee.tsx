'use client'

import type { FocusEvent, ReactNode } from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'

/** Velocidad de la cinta en escritorio (desde 1024 px), en píxeles por segundo. */
const SPEED_WIDE_PX_S = 40

/** Velocidad de la cinta en el celular (menos de 1024 px), en píxeles por segundo. */
const SPEED_NARROW_PX_S = 25

/** Desde qué ancho la cinta va a la velocidad de escritorio. */
const WIDE_QUERY = '(min-width: 1024px)'

/** Ancho del fundido de cada punta, en píxeles (la máscara y el margen al traer una tarjeta). */
const FADE_PX = 80

/** Tope de un cuadro, en segundos: después de un tirón la cinta no salta más que esto. */
const MAX_FRAME_S = 0.1

/**
 * Raíz de la cinta: ocupa todo el ancho, recorta lo que sale por los costados (`clip`, sin ser un
 * contenedor de scroll: el foco no la desplaza) y funde las puntas en 80 px. El margen vertical deja
 * lugar a la subida y al borde de las tarjetas. Con menos movimiento (también antes de hidratar) es
 * una fila deslizable sin fundidos, que arranca donde arranca el contenido del contenedor.
 */
const ROOT_CLASS =
  '-my-4 overflow-x-clip py-4 [mask-image:linear-gradient(90deg,transparent,#000_80px,#000_calc(100%_-_80px),transparent)] motion-reduce:snap-x motion-reduce:snap-mandatory motion-reduce:scroll-px-(--site-inset) motion-reduce:overflow-x-auto motion-reduce:overscroll-x-contain motion-reduce:[mask-image:none] motion-reduce:[scrollbar-width:none] motion-reduce:[&::-webkit-scrollbar]:hidden'

/** Una copia de la lista: las tarjetas en fila, separadas 20 px. */
const LIST_CLASS = 'flex shrink-0 gap-5'

/** Cada tarjeta: 380 px (hasta el 82 % de la pantalla en el celular). */
const ITEM_CLASS = 'w-[min(380px,82vw)] shrink-0 motion-reduce:snap-start'

/** Avisa a React cuando la pestaña se oculta o se vuelve a mostrar. */
function subscribeToVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange)
  return () => {
    document.removeEventListener('visibilitychange', onChange)
  }
}

/** Si la pestaña está oculta. */
function isPageHidden(): boolean {
  return document.visibilityState === 'hidden'
}

/** En el servidor no hay pestaña: se parte de "visible". */
function isPageHiddenOnServer(): boolean {
  return false
}

/** Exige que una medida sea finita y no negativa. */
function assertLength(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name} tiene que ser un número mayor o igual a 0; se recibió ${String(value)}.`,
    )
  }
}

/** Exige que una posición sea finita (puede ser negativa). */
function assertPosition(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} tiene que ser un número finito; se recibió ${String(value)}.`)
  }
}

/**
 * Avanza la cinta: suma la distancia y, al completar una vuelta (el ancho de una copia de la lista
 * más la separación), vuelve a empezar. Como la copia siguiente es igual, el salto no se ve.
 *
 * @param offset - Cuánto lleva corrida la pista hacia la izquierda, en píxeles.
 * @param distance - Cuánto avanza en este cuadro, en píxeles (velocidad por tiempo).
 * @param period - Lo que mide una vuelta, en píxeles; con 0 (sin medidas todavía) no se mueve.
 * @returns El corrimiento nuevo.
 * @throws {RangeError} Si algún valor no es finito, o si `distance` o `period` son negativos.
 * @example
 * advanceMarquee(98, 5, 100) // 3
 */
export function advanceMarquee(offset: number, distance: number, period: number): number {
  assertPosition('offset', offset)
  assertLength('distance', distance)
  assertLength('period', period)
  if (period === 0) return offset
  const next = offset + distance
  return next >= period ? next % period : next
}

/**
 * Corrimiento de la pista con que una tarjeta se ve entera, fuera de los fundidos de las puntas
 * (al enfocarla con Tab). Si ya se ve entera, no cambia; si es más ancha que el espacio, se alinea
 * a la izquierda.
 *
 * @param offset - Corrimiento actual de la pista hacia la izquierda, en píxeles.
 * @param itemStart - Dónde empieza la tarjeta dentro de la pista, en píxeles.
 * @param itemWidth - Ancho de la tarjeta, en píxeles.
 * @param viewport - Ancho visible de la cinta, en píxeles.
 * @param fade - Ancho del fundido de cada punta, en píxeles.
 * @returns El corrimiento con que la tarjeta queda a la vista.
 * @throws {RangeError} Si algún valor no es finito, o si un ancho es negativo.
 * @example
 * revealOffset(-80, 1200, 380, 1200, 80) // 460
 */
export function revealOffset(
  offset: number,
  itemStart: number,
  itemWidth: number,
  viewport: number,
  fade: number,
): number {
  assertPosition('offset', offset)
  assertPosition('itemStart', itemStart)
  assertLength('itemWidth', itemWidth)
  assertLength('viewport', viewport)
  assertLength('fade', fade)
  const left = itemStart - offset
  const right = left + itemWidth
  if (left >= fade && right <= viewport - fade) return offset
  if (left < fade || itemWidth > viewport - 2 * fade) return itemStart - fade
  return itemStart + itemWidth - (viewport - fade)
}

/** Corre la pista. */
function applyOffset(track: HTMLElement, offset: number): void {
  track.style.transform = `translate3d(${(-offset).toFixed(2)}px,0,0)`
}

/** Una tarjeta de la cinta. */
export interface ReviewsMarqueeItem {
  /** Identificador estable (el de la reseña). */
  id: string
  /** La tarjeta ya dibujada. */
  card: ReactNode
}

/** Props de {@link ReviewsMarquee}. */
export interface ReviewsMarqueeProps {
  /** Las tarjetas, en orden. */
  items: readonly ReviewsMarqueeItem[]
}

/**
 * Cinta continua de las reseñas del inicio (Ruling MR-12): ocupa todo el ancho de la ventana, con
 * fundidos de 80 px en las puntas, y las tarjetas (380 px, separadas 20) pasan solas de derecha a
 * izquierda, sin saltos, a 40 px/s en escritorio y 25 px/s en el celular, en un bucle infinito. La
 * pista lleva la lista y una copia decorativa (`aria-hidden` e `inert`, sin foco), o las que hagan
 * falta para llenar pantallas anchas; al recorrer una copia entera vuelve a empezar sin que se note
 * ({@link advanceMarquee}). Se mueve con `transform` en cada cuadro (`requestAnimationFrame`, sin
 * volver a dibujar React).
 *
 * Se pausa con el mouse encima, con el foco adentro, con la pestaña oculta y fuera de pantalla. Con
 * el teclado, Tab recorre las tarjetas de la primera copia y la enfocada se trae a la vista
 * ({@link revealOffset}). No tiene puntos ni flechas. Con `prefers-reduced-motion: reduce` es una
 * fila quieta y deslizable (`overflow-x: auto`), sin copia.
 *
 * @param props - Ver {@link ReviewsMarqueeProps}.
 */
export function ReviewsMarquee({ items }: ReviewsMarqueeProps): ReactNode {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const copyRef = useRef<HTMLUListElement>(null)
  // Arranca corrida a la derecha el ancho del fundido: la primera tarjeta se ve entera.
  const offsetRef = useRef(-FADE_PX)
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(WIDE_QUERY)
  const hidden = useSyncExternalStore(subscribeToVisibility, isPageHidden, isPageHiddenOnServer)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [copies, setCopies] = useState(1)
  const animated = !reduced && items.length > 0
  const paused = hovered || focused || hidden || !onScreen
  const speed = wide ? SPEED_WIDE_PX_S : SPEED_NARROW_PX_S

  // Fuera de pantalla la cinta espera (no gasta cuadros).
  useEffect(() => {
    const root = rootRef.current
    if (!animated || root === null || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver((entries) => {
      const last = entries.at(-1)
      if (last !== undefined) setOnScreen(last.isIntersecting)
    })
    observer.observe(root)
    return () => {
      observer.disconnect()
    }
  }, [animated])

  // En pantallas más anchas que una vuelta hacen falta más copias para no dejar un hueco.
  useEffect(() => {
    const root = rootRef.current
    const list = listRef.current
    if (!animated || root === null || list === null || typeof ResizeObserver === 'undefined') {
      return undefined
    }
    const observer = new ResizeObserver(() => {
      const period = list.offsetWidth
      if (period > 0) setCopies(Math.max(1, Math.ceil(root.clientWidth / period)))
    })
    observer.observe(root)
    observer.observe(list)
    return () => {
      observer.disconnect()
    }
  }, [animated])

  useEffect(() => {
    const track = trackRef.current
    if (track === null) return undefined
    if (!animated) {
      track.style.removeProperty('transform')
      return undefined
    }
    applyOffset(track, offsetRef.current)
    if (paused) return undefined
    let frame = 0
    let last: number | null = null
    const tick = (now: number): void => {
      const list = listRef.current
      const copy = copyRef.current
      if (last !== null && list !== null && copy !== null) {
        const seconds = Math.min(MAX_FRAME_S, Math.max(0, (now - last) / 1000))
        const period = copy.offsetLeft - list.offsetLeft
        offsetRef.current = advanceMarquee(offsetRef.current, speed * seconds, Math.max(0, period))
        applyOffset(track, offsetRef.current)
      }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [animated, paused, speed])

  /** Con el foco en una tarjeta de la primera copia, la trae a la vista. */
  const revealFocused = (event: FocusEvent<HTMLDivElement>): void => {
    const root = rootRef.current
    const track = trackRef.current
    const item = event.target.closest('li')
    if (!animated || root === null || track === null || item === null) return
    if (item.parentElement !== listRef.current) return
    offsetRef.current = revealOffset(
      offsetRef.current,
      item.offsetLeft,
      item.offsetWidth,
      root.clientWidth,
      FADE_PX,
    )
    applyOffset(track, offsetRef.current)
  }

  const cards = items.map((item) => (
    <li key={item.id} className={ITEM_CLASS}>
      {item.card}
    </li>
  ))

  return (
    <div
      ref={rootRef}
      data-marquee=""
      data-paused={animated && paused ? 'true' : 'false'}
      className={ROOT_CLASS}
      onMouseEnter={() => {
        setHovered(true)
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      onFocus={(event) => {
        setFocused(true)
        revealFocused(event)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div
        ref={trackRef}
        data-marquee-track=""
        className="relative flex w-max gap-5 will-change-transform motion-reduce:px-(--site-inset) motion-reduce:will-change-auto"
      >
        <ul ref={listRef} className={LIST_CLASS}>
          {cards}
        </ul>
        {animated
          ? Array.from({ length: copies }, (_, index) => (
              <ul
                key={index}
                ref={index === 0 ? copyRef : undefined}
                aria-hidden="true"
                inert
                className={`${LIST_CLASS} motion-reduce:hidden`}
              >
                {cards}
              </ul>
            ))
          : null}
      </div>
    </div>
  )
}
