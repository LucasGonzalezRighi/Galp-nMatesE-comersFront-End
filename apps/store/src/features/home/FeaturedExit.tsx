'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import { Children, isValidElement, useRef } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'

/** Desde este ancho la grilla se despide con el scroll; en el celular queda quieta. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Los valores de la salida de Destacados ({@link FEATURED_EXIT}). */
export interface FeaturedExitValues {
  /** El tramo del scroll: cuando el pie de la grilla pasa del 90 % al 10 % de la ventana. */
  readonly offset: readonly ['end 90%', 'end 10%']
  /** Opacidad de la grilla al principio y al final del tramo. */
  readonly opacity: readonly [number, number]
  /** Escala de la grilla (con el origen arriba). */
  readonly scale: readonly [number, number]
  /** Cuánto sube cada tarjeta, en píxeles. */
  readonly y: readonly [number, number]
  /** Qué parte del tramo espera la última tarjeta antes de subir (las demás, en proporción). */
  readonly lag: number
}

/**
 * La salida de Destacados, bien a la vista (Lucas, 2026-10-29: con 0,3 / 0,96 / 32 px no la
 * percibía): la grilla se apaga del todo y se achica al 88 %, y cada tarjeta sube 120 px; la primera
 * arranca con el tramo y la última espera un 22 % del tramo, así la segunda fila sale más tarde.
 */
export const FEATURED_EXIT: FeaturedExitValues = {
  offset: ['end 90%', 'end 10%'],
  opacity: [1, 0],
  scale: [1, 0.88],
  y: [0, -120],
  lag: 0.22,
}

/** Props de {@link FeaturedExit}. */
export interface FeaturedExitProps {
  /** Clase de la grilla. */
  className?: string
  /** Las tarjetas de la grilla. */
  children: ReactNode
}

/** Props de {@link ExitingCard}. */
interface ExitingCardProps {
  /** El avance de la salida de la grilla, de 0 a 1. */
  progress: MotionValue<number>
  /** Qué parte del tramo espera antes de subir. */
  lag: number
  /** La tarjeta. */
  children: ReactNode
}

/** Una celda de la grilla que sube con su propio retraso. */
function ExitingCard({ progress, lag, children }: ExitingCardProps): ReactNode {
  const y = useTransform(progress, [lag, 1], [...FEATURED_EXIT.y])
  return (
    <m.div className="min-w-0" style={{ y }}>
      {children}
    </m.div>
  )
}

/** La grilla con la salida ligada al scroll (solo con movimiento y en escritorio). */
function ExitingGrid({ className, children }: FeaturedExitProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: [...FEATURED_EXIT.offset] })
  const opacity = useTransform(scrollYProgress, [0, 1], [...FEATURED_EXIT.opacity])
  const scale = useTransform(scrollYProgress, [0, 1], [...FEATURED_EXIT.scale])
  const cards = Children.toArray(children)
  const last = Math.max(1, cards.length - 1)
  return (
    <m.div
      ref={ref}
      className={className}
      style={{ opacity, scale, transformOrigin: 'top center', willChange: 'transform' }}
    >
      {cards.map((card, index) => (
        <ExitingCard
          key={isValidElement(card) ? card.key : index}
          progress={scrollYProgress}
          lag={(FEATURED_EXIT.lag * index) / last}
        >
          {card}
        </ExitingCard>
      ))}
    </m.div>
  )
}

/**
 * Grilla de Destacados que se despide al salir de pantalla ({@link FEATURED_EXIT}): mientras su pie
 * sube del 90 % al 10 % de la ventana pasa de opacidad 1 a 0 y de escala 1 a 0,88, con el origen
 * arriba, y cada tarjeta (en su capa, que es la celda de la grilla) sube 120 px, con un retraso que
 * crece con su lugar: la segunda fila sale después que la primera. Es un scrub (sin resorte): ir y
 * volver con el scroll la arma y desarma igual.
 *
 * Con `prefers-reduced-motion: reduce` o por debajo de 1024 px se dibuja quieta, sin estilos en
 * línea (también en el servidor y en la hidratación, que no conocen la ventana).
 *
 * @param props - Ver {@link FeaturedExitProps}.
 */
export function FeaturedExit({ className, children }: FeaturedExitProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(DESKTOP_QUERY)
  if (reduced || !wide) return <div className={className}>{children}</div>
  return (
    <LazyMotion features={domAnimation}>
      <ExitingGrid className={className}>{children}</ExitingGrid>
    </LazyMotion>
  )
}
