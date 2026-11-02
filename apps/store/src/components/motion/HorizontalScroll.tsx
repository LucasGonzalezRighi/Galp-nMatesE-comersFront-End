'use client'

import type { MotionValue } from 'motion/react'
import type { CSSProperties, FocusEvent, ReactNode } from 'react'
import { m, useMotionValue, useScroll, useTransform } from 'motion/react'
import { createContext, useContext, useEffect, useRef } from 'react'
import './horizontal-scroll.css'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertFinite } from './validate'

/** Avance de la sección (0 a 1) para quien dibuja la barra de progreso adentro. */
const ProgressContext = createContext<MotionValue<number> | null>(null)

/** Estilo de la pista de tarjetas, igual al del diseño. */
const TRACK_STYLE: CSSProperties = {
  position: 'relative',
  display: 'flex',
  gap: 20,
  padding: '0 clamp(20px, 5vw, 64px)',
  width: 'max-content',
}

/** Datos para calcular a qué altura hay que hacer scroll para mostrar un ítem de la pista. */
export interface HorizontalScrollTargetInput {
  /** Distancia del ítem al borde izquierdo de la pista, en píxeles. */
  itemLeft: number
  /** Margen izquierdo de la pista (su `padding`), en píxeles: el ítem queda alineado a él. */
  gutter: number
  /** Recorrido horizontal total de la pista, en píxeles. */
  distance: number
  /** Posición de la sección desde el principio de la página, en píxeles. */
  sectionTop: number
  /** Scroll vertical que dura la sección: su alto menos el alto de la ventana, en píxeles. */
  scrollSpan: number
}

/**
 * Calcula el scroll vertical con el que un ítem de la pista queda a la vista. Sirve para que el
 * foco del teclado no desordene la sección fija: en vez de desplazar la pista a mano, se avanza
 * el scroll de la página hasta el punto donde ese ítem aparece.
 *
 * @param input - Ver {@link HorizontalScrollTargetInput}.
 * @returns La posición de scroll de la página, en píxeles desde el principio.
 * @throws {RangeError} Si algún dato no es un número finito.
 */
export function horizontalScrollTarget(input: HorizontalScrollTargetInput): number {
  assertFinite('itemLeft', input.itemLeft)
  assertFinite('gutter', input.gutter)
  assertFinite('distance', input.distance)
  assertFinite('sectionTop', input.sectionTop)
  assertFinite('scrollSpan', input.scrollSpan)
  if (input.distance <= 0 || input.scrollSpan <= 0) return input.sectionTop
  const progress = Math.min(1, Math.max(0, (input.itemLeft - input.gutter) / input.distance))
  return input.sectionTop + progress * input.scrollSpan
}

/** Props de {@link HorizontalScroll}. */
export interface HorizontalScrollProps {
  /**
   * Encabezado fijo arriba de la pista (título, contador). Puede incluir un
   * {@link HorizontalScrollProgress}.
   */
  header?: ReactNode
  /** Clase de la sección. */
  className?: string
  /** Estilo de la pista de tarjetas; reemplaza lo que coincida con el del diseño. */
  trackStyle?: CSSProperties
  /** Las tarjetas, una al lado de la otra. Cada una tiene que tener un ancho fijo. */
  children?: ReactNode
}

/** La sección fija: la pista se desplaza con el scroll vertical. */
function PinnedScroll({
  header,
  className,
  trackStyle,
  children,
}: HorizontalScrollProps): ReactNode {
  const sectionRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const distance = useMotionValue(0)
  const sectionHeight = useMotionValue(0)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const trackX = useTransform([scrollYProgress, distance], (values: number[]) => {
    const [progress = 0, total = 0] = values
    return -progress * total
  })

  useEffect(() => {
    const sticky = stickyRef.current
    const track = trackRef.current
    if (sticky === null || track === null) return
    const measure = (): void => {
      const total = Math.max(0, track.scrollWidth - sticky.clientWidth)
      distance.set(total)
      sectionHeight.set(sticky.clientHeight + total)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(sticky)
    observer.observe(track)
    return () => {
      observer.disconnect()
    }
  }, [distance, sectionHeight])

  const onFocusCapture = (event: FocusEvent<HTMLDivElement>): void => {
    const track = trackRef.current
    const section = sectionRef.current
    if (track === null || section === null || !(event.target instanceof HTMLElement)) return
    let item: HTMLElement | null = event.target
    while (item !== null && item.parentElement !== track) item = item.parentElement
    if (item === null) return
    window.scrollTo({
      top: horizontalScrollTarget({
        itemLeft: item.offsetLeft,
        gutter: Number.parseFloat(getComputedStyle(track).paddingLeft) || 0,
        distance: distance.get(),
        sectionTop: section.getBoundingClientRect().top + window.scrollY,
        scrollSpan: section.offsetHeight - window.innerHeight,
      }),
      behavior: 'auto',
    })
  }

  return (
    <ProgressContext.Provider value={scrollYProgress}>
      <m.section
        ref={sectionRef}
        className={className === undefined ? 'hscroll-section' : `hscroll-section ${className}`}
        style={{ position: 'relative', height: sectionHeight }}
      >
        <div
          ref={stickyRef}
          className="hscroll-sticky"
          onFocusCapture={onFocusCapture}
          onScroll={(event) => {
            // El navegador desplaza este contenedor al enfocar algo fuera de vista; la pista se
            // mueve con `transform`, así que se lo devuelve a 0.
            event.currentTarget.scrollLeft = 0
          }}
          style={{
            position: 'sticky',
            top: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 36,
          }}
        >
          {header}
          <m.div ref={trackRef} style={{ ...TRACK_STYLE, ...trackStyle, x: trackX }}>
            {children}
          </m.div>
        </div>
      </m.section>
    </ProgressContext.Provider>
  )
}

/**
 * Sección que queda fija mientras se hace scroll vertical y desplaza sus tarjetas de lado a lado
 * (colección horizontal del inicio). Su alto se ajusta solo al recorrido que necesita la pista.
 *
 * El foco del teclado sobre una tarjeta avanza el scroll hasta mostrarla. Con
 * `prefers-reduced-motion: reduce` no se fija nada: las tarjetas quedan en una fila con scroll
 * horizontal propio.
 *
 * @param props - Ver {@link HorizontalScrollProps}.
 */
export function HorizontalScroll(props: HorizontalScrollProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  if (reduced) {
    return (
      <section className={props.className} style={{ position: 'relative' }}>
        {props.header}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ ...TRACK_STYLE, ...props.trackStyle }}>{props.children}</div>
        </div>
      </section>
    )
  }
  return (
    <MotionFeatures>
      <PinnedScroll {...props} />
    </MotionFeatures>
  )
}

/** Props de {@link HorizontalScrollProgress}. */
export interface HorizontalScrollProgressProps {
  /** Clase del riel de la barra. */
  className?: string
}

/**
 * Barra fina que se llena con el avance de la {@link HorizontalScroll} que la contiene (se pone
 * en su `header`). Es decorativa (`aria-hidden`). Fuera de una `HorizontalScroll`, y con
 * `prefers-reduced-motion: reduce`, no dibuja nada.
 *
 * @param props - Ver {@link HorizontalScrollProgressProps}.
 */
export function HorizontalScrollProgress({ className }: HorizontalScrollProgressProps): ReactNode {
  const progress = useContext(ProgressContext)
  if (progress === null) return null
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        position: 'relative',
        display: 'block',
        flex: 1,
        height: 1,
        background: 'var(--color-neutral-800)',
      }}
    >
      <m.span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--color-accent)',
          boxShadow: '0 0 10px var(--color-accent)',
          transformOrigin: 'left',
          scaleX: progress,
        }}
      />
    </span>
  )
}
