'use client'

import type { ReactNode } from 'react'
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft'
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePrefersReducedMotion } from '../../components/motion'
import { IconButton } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { HOME_COPY, reviewPositionLabel } from './home.copy'

/** Cada cuánto avanza solo el carrusel, en milisegundos. */
const AUTOPLAY_MS = 6000

/** Desde qué fracción visible una tarjeta cuenta como vista (la primera vista es la actual). */
const SEEN_RATIO = 0.6

/** Desde qué fracción visible una tarjeta cuenta como entera (para saber si se llegó a un extremo). */
const FULL_RATIO = 0.95

/** Tamaño de las flechas de los botones, en píxeles. */
const ARROW_SIZE = 16

/** Lo que muestra la pista: la tarjeta actual y si se llegó a alguno de los extremos. */
interface TrackView {
  /** Posición de la tarjeta actual (la primera que se ve), desde 0. */
  current: number
  /** Si la primera tarjeta se ve entera. */
  atStart: boolean
  /** Si la última tarjeta se ve entera. */
  atEnd: boolean
}

/**
 * Lo que muestra la pista según cuánto se ve de cada tarjeta. Mientras ninguna llega a verse
 * (en el medio de un deslizamiento en el celular) conserva la actual.
 */
function trackView(previous: TrackView, ratios: readonly number[]): TrackView {
  const first = ratios.findIndex((ratio) => ratio >= SEEN_RATIO)
  const current = first === -1 ? previous.current : first
  const atStart = (ratios[0] ?? 0) >= FULL_RATIO
  const atEnd = (ratios.at(-1) ?? 0) >= FULL_RATIO
  const unchanged =
    current === previous.current && atStart === previous.atStart && atEnd === previous.atEnd
  return unchanged ? previous : { current, atStart, atEnd }
}

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

/** Una tarjeta del carrusel. */
export interface ReviewsCarouselItem {
  /** Identificador estable (el de la reseña). */
  id: string
  /** La tarjeta ya dibujada. */
  card: ReactNode
}

/** Props de {@link ReviewsCarousel}. */
export interface ReviewsCarouselProps {
  /** Las tarjetas, en orden. */
  items: readonly ReviewsCarouselItem[]
}

/**
 * Carrusel de las reseñas del inicio: una pista con desplazamiento horizontal y `scroll-snap`
 * (sin JavaScript sigue siendo una lista deslizable), botones "Anterior" y "Siguiente" que se
 * deshabilitan en los extremos y un punto por reseña con `aria-current` en la actual (la primera
 * que se ve; al llegar al final, la última, así con tres a la vista se marcan también los últimos
 * puntos). La tarjeta actual sale de un `IntersectionObserver` sobre las tarjetas, nunca de un
 * listener de `scroll`. Avanza solo cada seis segundos y vuelve a la primera al llegar al final; se
 * pausa con el mouse encima, con el foco adentro, con la pestaña oculta, con el carrusel fuera de
 * pantalla (otro `IntersectionObserver`, contra la ventana) y con `prefers-reduced-motion`. Al
 * enfocar una tarjeta con Tab la trae a la vista, y al usar los botones anuncia "Reseña n de m".
 *
 * @param props - Ver {@link ReviewsCarouselProps}.
 */
export function ReviewsCarousel({ items }: ReviewsCarouselProps): ReactNode {
  const count = items.length
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const reduced = usePrefersReducedMotion()
  const hidden = useSyncExternalStore(subscribeToVisibility, isPageHidden, isPageHiddenOnServer)
  const [view, setView] = useState<TrackView>({ current: 0, atStart: true, atEnd: count <= 1 })
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const paused = reduced || hidden || hovered || focused || !onScreen || count < 2
  // El punto marcado: al llegar al final, el último (con tres a la vista la primera sería la 3.ª).
  const currentDot = view.atEnd ? count - 1 : view.current

  // Si el carrusel está en pantalla: fuera de ella el avance automático espera.
  useEffect(() => {
    const root = rootRef.current
    if (root === null) return undefined
    const observer = new IntersectionObserver((entries) => {
      const last = entries.at(-1)
      if (last !== undefined) setOnScreen(last.isIntersecting)
    })
    observer.observe(root)
    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (track === null) return undefined
    const cards = Array.from(track.children)
    const ratios = cards.map(() => 0)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = cards.indexOf(entry.target)
          if (index !== -1) ratios[index] = entry.intersectionRatio
        }
        setView((previous) => trackView(previous, ratios))
      },
      { root: track, threshold: [0, SEEN_RATIO, FULL_RATIO] },
    )
    for (const card of cards) observer.observe(card)
    return () => {
      observer.disconnect()
    }
  }, [count])

  const goTo = useCallback(
    (index: number, announce: boolean): void => {
      const track = trackRef.current
      const card = track?.children.item(index)
      if (track === null || card === null || card === undefined) return
      const left =
        track.scrollLeft + card.getBoundingClientRect().left - track.getBoundingClientRect().left
      track.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' })
      if (announce) setAnnouncement(reviewPositionLabel(index + 1, count))
    },
    [count, reduced],
  )

  useEffect(() => {
    if (paused) return undefined
    const timer = window.setInterval(() => {
      goTo(view.atEnd ? 0 : view.current + 1, false)
    }, AUTOPLAY_MS)
    return () => {
      window.clearInterval(timer)
    }
  }, [paused, view, goTo])

  return (
    <div
      ref={rootRef}
      data-carousel=""
      onMouseEnter={() => {
        setHovered(true)
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      onFocus={() => {
        setFocused(true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <ul
        ref={trackRef}
        className="-my-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto overscroll-x-contain py-4 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="w-[min(66%,380px)] shrink-0 snap-start lg:w-[calc((100%-2.5rem)/3)]"
            onFocus={(event) => {
              event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' })
            }}
          >
            {item.card}
          </li>
        ))}
      </ul>
      {count < 2 ? null : (
        <div className="mt-8 flex items-center justify-between gap-4">
          <div role="group" aria-label={HOME_COPY.reviewsDots} className="flex items-center">
            {items.map((item, index) => {
              const isCurrent = index === currentDot
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={reviewPositionLabel(index + 1, count)}
                  aria-current={isCurrent ? 'true' : undefined}
                  className="group grid size-6 cursor-pointer place-items-center"
                  onClick={() => {
                    goTo(index, false)
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'size-1.5 rounded-full transition-[transform,background-color] duration-300',
                      isCurrent
                        ? 'bg-accent scale-150'
                        : 'bg-neutral-600 group-hover:bg-neutral-400',
                    )}
                  />
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <IconButton
              variant="secondary"
              aria-label={HOME_COPY.reviewsPrevious}
              className="rounded-full"
              disabled={view.atStart}
              onClick={() => {
                goTo(Math.max(0, view.current - 1), true)
              }}
            >
              <CaretLeftIcon size={ARROW_SIZE} aria-hidden="true" />
            </IconButton>
            <IconButton
              variant="secondary"
              aria-label={HOME_COPY.reviewsNext}
              className="rounded-full"
              disabled={view.atEnd}
              onClick={() => {
                goTo(Math.min(count - 1, view.current + 1), true)
              }}
            >
              <CaretRightIcon size={ARROW_SIZE} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
