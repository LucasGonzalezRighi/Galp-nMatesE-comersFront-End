'use client'

import type { MotionValue } from 'motion/react'
import type { CSSProperties, FocusEvent, ReactNode } from 'react'
import { useScroll } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertIntegerInRange } from './validate'

/** Atributo que marca, dentro del escenario, el elemento de cada parada con su posición (desde 0). */
export const STAGE_STOP_ATTRIBUTE = 'data-stage-stop'

/** Lo que el {@link ScrollStage} comparte con quien dibuja adentro. */
export interface ScrollStageContextValue {
  /** Avance del scroll de la sección, de 0 (recién fijada) a 1 (a punto de soltarse). */
  progress: MotionValue<number>
  /** Cantidad de paradas. */
  stops: number
  /**
   * Desplaza la página al principio de una parada: suave, o instantáneo con
   * `prefers-reduced-motion: reduce`.
   *
   * @throws {RangeError} Si `index` no es un entero de 0 a `stops - 1`.
   */
  scrollToStop: (index: number) => void
}

/** El contexto del escenario; `null` fuera de un {@link ScrollStage}. */
const StageContext = createContext<ScrollStageContextValue | null>(null)

/** Props de {@link ScrollStage}. */
export interface ScrollStageProps {
  /** Cantidad de paradas, un entero de 1 a 50: cada una dura una ventana de scroll. */
  stops: number
  /** Nombre accesible de la sección (`aria-label`). */
  label: string
  /** Clase de la sección. */
  className?: string
  /** Lo que se dibuja en el escenario fijo. */
  children?: ReactNode
}

/** Estilo del escenario: fijo arriba, a la altura de la ventana, y sin scroll propio. */
const STAGE_STYLE: CSSProperties = { position: 'sticky', top: 0, overflow: 'hidden' }

/** Alto de la sección (`(paradas + 1) × 100svh`, con `vh` de respaldo) y del escenario (`100svh`). */
const SECTION_CLASS =
  'h-[calc((var(--stage-stops)+1)*100vh)] supports-[height:100svh]:h-[calc((var(--stage-stops)+1)*100svh)]'
const STAGE_CLASS = 'h-screen supports-[height:100svh]:h-svh'

/**
 * Sección que deja fijo un escenario a la altura de la ventana mientras se hace scroll: mide
 * `(stops + 1) × 100svh`, así cada parada dura una ventana de scroll. No dibuja nada propio: da por
 * contexto ({@link useScrollStage}) el avance de la sección y `scrollToStop`, y quien dibuja adentro
 * decide qué se mueve.
 *
 * Al enfocar con el teclado algo de una parada que no es la actual (un elemento dentro de otro con
 * `data-stage-stop="n"`), la página se desplaza a esa parada, como hace `HorizontalScroll`.
 *
 * @param props - Ver {@link ScrollStageProps}.
 * @throws {RangeError} Si `stops` no es un entero de 1 a 50.
 */
export function ScrollStage({ stops, label, className, children }: ScrollStageProps): ReactNode {
  assertIntegerInRange('stops', stops, 1, 50)
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })

  const goTo = useCallback(
    (index: number, behavior: ScrollBehavior): void => {
      assertIntegerInRange('index', index, 0, stops - 1)
      const section = sectionRef.current
      if (section === null) return
      const sectionTop = section.getBoundingClientRect().top + window.scrollY
      const scrollSpan = Math.max(0, section.offsetHeight - window.innerHeight)
      window.scrollTo({ top: sectionTop + (scrollSpan * index) / stops, behavior })
    },
    [stops],
  )

  const value = useMemo<ScrollStageContextValue>(
    () => ({
      progress: scrollYProgress,
      stops,
      scrollToStop: (index) => {
        goTo(index, reduced ? 'auto' : 'smooth')
      },
    }),
    [goTo, reduced, scrollYProgress, stops],
  )

  const onFocusCapture = (event: FocusEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof Element)) return
    const stop = event.target.closest(`[${STAGE_STOP_ATTRIBUTE}]`)
    if (stop === null || !event.currentTarget.contains(stop)) return
    const index = Number(stop.getAttribute(STAGE_STOP_ATTRIBUTE))
    if (!Number.isInteger(index) || index < 0 || index >= stops) return
    const current = Math.min(stops - 1, Math.floor(scrollYProgress.get() * stops))
    if (index !== current) goTo(index, 'auto')
  }

  return (
    <StageContext.Provider value={value}>
      <section
        ref={sectionRef}
        aria-label={label}
        className={className === undefined ? SECTION_CLASS : `${SECTION_CLASS} ${className}`}
        style={{ position: 'relative', '--stage-stops': stops } as CSSProperties}
      >
        <div
          className={STAGE_CLASS}
          style={STAGE_STYLE}
          onFocusCapture={onFocusCapture}
          onScroll={(event) => {
            // El navegador desplaza el escenario al enfocar algo fuera de vista; lo que se mueve
            // adentro usa `transform`, así que se lo devuelve a su lugar.
            event.currentTarget.scrollLeft = 0
            event.currentTarget.scrollTop = 0
          }}
        >
          <MotionFeatures>{children}</MotionFeatures>
        </div>
      </section>
    </StageContext.Provider>
  )
}

/**
 * Lee el contexto del {@link ScrollStage} que contiene al componente: el avance de la sección, la
 * cantidad de paradas y `scrollToStop`.
 *
 * @returns Ver {@link ScrollStageContextValue}.
 * @throws {Error} Si se usa fuera de un `ScrollStage`.
 */
export function useScrollStage(): ScrollStageContextValue {
  const value = useContext(StageContext)
  if (value === null) throw new Error('useScrollStage se usa dentro de un ScrollStage.')
  return value
}
