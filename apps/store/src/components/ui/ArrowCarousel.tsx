'use client'

import type { ReactNode } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react/ArrowLeft'
import { ArrowRightIcon } from '@phosphor-icons/react/ArrowRight'
import { Children, isValidElement, useEffect, useId, useRef, useState } from 'react'
import type { CarouselDirection } from './arrow-carousel'
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion'
import { counterLabel, indexAtScroll, positionLabel, stepIndex } from './arrow-carousel'
import { cx } from './cx'

/** Props de {@link ArrowCarousel}. */
export interface ArrowCarouselProps {
  /** Nombre accesible de la región ("Líneas de producto", "Combos"). */
  label: string
  /** Qué es cada tarjeta para el lector de pantalla (`aria-roledescription`: "línea", "combo"). */
  itemLabel: string
  /** Nombre accesible de la flecha que va a la tarjeta anterior ("Línea anterior"). */
  prevLabel: string
  /** Nombre accesible de la flecha que va a la tarjeta siguiente ("Línea siguiente"). */
  nextLabel: string
  /** El título de la sección: desde 768 px las flechas y el contador van a su derecha. */
  header?: ReactNode
  /** Una tarjeta por hijo, en orden; cada una se envuelve en su grupo con la posición. */
  children: ReactNode[]
  /** Clases que se suman a las de la fila (por ejemplo, otro espacio entre tarjetas). */
  trackClassName?: string
}

/** Qué tarjeta es la actual y si hay que decirlo en voz alta. */
interface CarouselState {
  /** Índice de la tarjeta actual, desde 0. */
  index: number
  /**
   * La eligió una flecha: su posición se anuncia en la región viva. Si se llegó deslizando la fila
   * o con el foco no hace falta: quien navega con lector de pantalla ya está parado en la tarjeta.
   */
  announced: boolean
}

/** Así sale del servidor: la primera tarjeta, sin anunciar nada. */
const INITIAL_STATE: CarouselState = { index: 0, announced: false }

/** Cuánto tiene que estar quieta la fila (ms) para leer en qué tarjeta quedó. */
const SETTLE_MS = 120

/** Lado del ícono de las flechas en px, dentro del botón redondo de 46 px. */
const ARROW_ICON_SIZE = 15

/**
 * La grilla de la sección: el margen del sitio son dos columnas de relleno a los lados del título y
 * de los controles. `--site-inset` lleva un `100%`: como ancho de columna se mide contra toda la
 * sección, igual que el relleno de la fila (`col-span-full`); como `padding` del título o de los
 * controles se mediría contra el área de su columna y, desde más de 1920 px, quedarían más afuera
 * que la primera tarjeta.
 */
const SECTION_CLASS =
  'grid grid-cols-[var(--site-inset)_minmax(0,1fr)_var(--site-inset)] gap-y-4 md:grid-cols-[var(--site-inset)_minmax(0,1fr)_auto_var(--site-inset)] md:gap-y-6'

/**
 * La fila: scroll lateral nativo con imán de a una tarjeta (el dedo y el trackpad funcionan
 * solos; la rueda vertical baja la página), el margen del sitio a los lados y sin barra. El
 * relleno de 16 px arriba y abajo deja lugar a la tarjeta que sube o se inclina con el mouse y al
 * contorno del foco (una fila con scroll lateral recorta lo que asoma arriba y abajo).
 */
const TRACK_CLASS =
  'col-span-full flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain scroll-px-(--site-inset) px-(--site-inset) py-4 [scrollbar-width:none] md:row-start-2 [&::-webkit-scrollbar]:hidden'

/**
 * Flecha redonda de 46 px con un anillo fino: con el hover el anillo pasa a cobre y la flecha se
 * corre 3 px hacia donde apunta, con resorte; al apretarla se achica a 0,94. Con menos movimiento
 * solo cambia el anillo. El foco usa el contorno global.
 */
const ARROW_CLASS =
  'text-foreground ease-spring grid size-[46px] flex-none cursor-pointer place-items-center rounded-full border border-transparent bg-transparent p-0 shadow-[inset_0_0_0_1px_var(--color-neutral-700)] transition-[translate,scale,box-shadow] duration-300 hover:shadow-[inset_0_0_0_1px_var(--color-accent)] motion-safe:active:scale-[.94] motion-reduce:transition-none'

/** Corrimiento de cada flecha con el hover: hacia donde apunta. */
const ARROW_NUDGE_CLASS: Record<CarouselDirection, string> = {
  [-1]: 'motion-safe:hover:-translate-x-[3px]',
  1: 'motion-safe:hover:translate-x-[3px]',
}

/** Las tarjetas de la fila (los grupos que envuelven a cada hijo). */
function cardsOf(track: HTMLElement): HTMLElement[] {
  return Array.from(track.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  )
}

/**
 * Exige que un texto del carrusel no esté vacío.
 *
 * @param name - Nombre de la prop, para el mensaje.
 * @param value - Texto recibido.
 * @throws {RangeError} Si `value` está vacío o solo tiene espacios.
 */
function assertText(name: string, value: string): void {
  if (value.trim() === '') {
    throw new RangeError(`ArrowCarousel necesita un texto en ${name}.`)
  }
}

/** Props de {@link ArrowButton}. */
interface ArrowButtonProps {
  /** Hacia dónde mueve. */
  direction: CarouselDirection
  /** Nombre accesible: el botón es solo un ícono. */
  label: string
  /** `id` de la fila que mueve (`aria-controls`). */
  controls: string
  /** Se llama con la dirección al apretarla. */
  onPress: (direction: CarouselDirection) => void
}

/** Flecha redonda que pasa a la tarjeta anterior o a la siguiente. */
function ArrowButton({ direction, label, controls, onPress }: ArrowButtonProps): ReactNode {
  const Icon = direction === -1 ? ArrowLeftIcon : ArrowRightIcon
  return (
    <button
      type="button"
      aria-label={label}
      aria-controls={controls}
      className={cx(ARROW_CLASS, ARROW_NUDGE_CLASS[direction])}
      onClick={() => {
        onPress(direction)
      }}
    >
      <Icon size={ARROW_ICON_SIZE} aria-hidden="true" />
    </button>
  )
}

/**
 * Carrusel con flechas (Ruling IC-9, como el `TripsFan` de Hoy Estoy OOH): una fila de tarjetas con
 * scroll lateral nativo e imán (`scroll-snap`), así el dedo y el trackpad la deslizan solos y la
 * rueda del mouse sigue bajando la página: nada se clava. Dos flechas redondas de 46 px
 * (`aria-controls` de la fila) corren la fila de a una tarjeta con `scrollTo` (suave; sin animar
 * con menos movimiento) y dan la vuelta en los extremos. El contador ("01 / 07", decorativo)
 * sigue a la tarjeta que quedó al comienzo, también al deslizar o al entrar con Tab (el navegador
 * corre la fila solo hasta la tarjeta enfocada). La región viva anuncia "3 de 7" solo después de
 * tocar una flecha. Cada tarjeta es un grupo con `aria-roledescription={itemLabel}` y su posición
 * de nombre.
 *
 * Desde 768 px las flechas y el contador van a la derecha de `header`; más angosto, abajo de la
 * fila. El título, los controles y la fila respetan el margen del sitio (`--site-inset`) y
 * arrancan en la misma x a cualquier ancho de pantalla, así que el carrusel va a todo el ancho, sin
 * `site-container` alrededor. No sabe nada de lo que muestra.
 *
 * @param props - Ver {@link ArrowCarouselProps}.
 * @throws {RangeError} Si no hay tarjetas o algún texto está vacío.
 * @example
 * <ArrowCarousel
 *   label="Combos"
 *   itemLabel="combo"
 *   prevLabel="Combo anterior"
 *   nextLabel="Combo siguiente"
 *   header={<h2>Combos listos para cebar</h2>}
 * >
 *   {combos.map((combo) => <ComboCard key={combo.id} combo={combo} />)}
 * </ArrowCarousel>
 */
export function ArrowCarousel({
  label,
  itemLabel,
  prevLabel,
  nextLabel,
  header,
  children,
  trackClassName,
}: ArrowCarouselProps): ReactNode {
  const trackId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const [state, setState] = useState(INITIAL_STATE)
  // Cancela la lectura pendiente de la fila: la usa una flecha, cuyo destino manda.
  const cancelSettle = useRef<() => void>(() => undefined)

  // Al deslizar la fila (dedo, trackpad, foco con Tab o una flecha), cuando queda quieta se lee en
  // qué tarjeta quedó. Se espera a que se quede quieta para no pisar el destino de una flecha a
  // mitad del desplazamiento suave.
  useEffect(() => {
    const track = trackRef.current
    if (track === null) return
    let timer: ReturnType<typeof setTimeout> | undefined
    cancelSettle.current = () => {
      clearTimeout(timer)
    }
    const settle = (): void => {
      const cards = cardsOf(track)
      const first = cards[0]
      if (first === undefined) return
      const starts = cards.map((card) => card.offsetLeft - first.offsetLeft)
      const maxScrollLeft = track.scrollWidth - track.clientWidth
      setState((current) => {
        const index = indexAtScroll(
          { scrollLeft: track.scrollLeft, maxScrollLeft, starts },
          Math.min(current.index, cards.length - 1),
        )
        return index === current.index ? current : { index, announced: false }
      })
    }
    const onScroll = (): void => {
      clearTimeout(timer)
      timer = setTimeout(settle, SETTLE_MS)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [])

  const items = Children.toArray(children)
  const count = items.length
  if (count === 0) throw new RangeError('ArrowCarousel necesita al menos una tarjeta.')
  assertText('label', label)
  assertText('itemLabel', itemLabel)
  assertText('prevLabel', prevLabel)
  assertText('nextLabel', nextLabel)
  const index = Math.min(state.index, count - 1)

  /** Pasa a la tarjeta de al lado, la anuncia y corre la fila (no la página) hasta ella. */
  const step = (direction: CarouselDirection): void => {
    // Si la fila acaba de quedar quieta, la lectura pendiente es de antes de esta flecha (el
    // desplazamiento suave nuevo todavía no avisó nada) y pisaría su destino.
    cancelSettle.current()
    const target = stepIndex(index, direction, count)
    setState({ index: target, announced: true })
    const track = trackRef.current
    if (track === null) return
    const cards = cardsOf(track)
    const first = cards[0]
    const card = cards[target]
    if (first === undefined || card === undefined) return
    track.scrollTo({
      left: card.offsetLeft - first.offsetLeft,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  return (
    <section aria-label={label} className={SECTION_CLASS}>
      {header !== undefined && (
        <div className="col-start-2 min-w-0 md:row-start-1 md:self-end">{header}</div>
      )}
      <div className="order-last col-start-2 flex items-center justify-between gap-5 md:order-none md:col-start-3 md:row-start-1 md:justify-end md:self-end md:pl-6">
        <p
          aria-hidden="true"
          className="text-[13px] tracking-[0.04em] text-neutral-300 tabular-nums"
        >
          {counterLabel(index, count)}
        </p>
        <div className="flex gap-2">
          <ArrowButton direction={-1} label={prevLabel} controls={trackId} onPress={step} />
          <ArrowButton direction={1} label={nextLabel} controls={trackId} onPress={step} />
        </div>
      </div>
      <div id={trackId} ref={trackRef} className={cx(TRACK_CLASS, trackClassName)}>
        {items.map((child, position) => (
          <div
            key={isValidElement(child) && child.key !== null ? child.key : position}
            role="group"
            aria-roledescription={itemLabel}
            aria-label={positionLabel(position, count)}
            className="flex-none snap-start"
          >
            {child}
          </div>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {state.announced ? positionLabel(index, count) : ''}
      </p>
    </section>
  )
}
