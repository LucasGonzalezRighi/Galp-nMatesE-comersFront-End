'use client'

import type { TargetAndTransition, Variants } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { useRef } from 'react'
import { tokens } from '@galpon/design-tokens'
import { EASE_MAIN } from './easing'
import { MotionFeatures } from './MotionFeatures'
import { INNER_TAGS, MOTION_TAGS, type MotionTag } from './tags'
import { useRevealDisabled } from './use-reveal-disabled'
import { assertNonNegative } from './validate'

/** Formas de aparecer que ofrece {@link Reveal}. */
export const REVEAL_KINDS = ['up', 'rise', 'fade', 'scale', 'left', 'clip', 'bar'] as const

/** Una de las formas de {@link REVEAL_KINDS}. */
export type RevealKind = (typeof REVEAL_KINDS)[number]

/** Estado inicial (oculto) de cada forma, igual al del diseño. */
const HIDDEN: Record<RevealKind, TargetAndTransition> = {
  up: { opacity: 0, y: 28, filter: 'blur(5px)' },
  rise: { y: '108%' },
  fade: { opacity: 0 },
  scale: { opacity: 0, scale: 0.9, filter: 'blur(10px)' },
  left: { opacity: 0, x: -28 },
  clip: { clipPath: 'inset(0 0 100% 0)' },
  bar: { scaleX: 0 },
}

/** Estado final (visible) de cada forma. */
const SHOWN: Record<RevealKind, TargetAndTransition> = {
  up: { opacity: 1, y: 0, filter: 'blur(0px)' },
  rise: { y: '0%' },
  fade: { opacity: 1 },
  scale: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  left: { opacity: 1, x: 0 },
  clip: { clipPath: 'inset(0 0 0% 0)' },
  bar: { scaleX: 1 },
}

/** Cuándo se considera que el elemento entró en pantalla: 8 % visible, 6 % antes del borde. */
const VIEWPORT = { once: true, amount: 0.08, margin: '0px 0px -6% 0px' } as const

/** Variantes vacías: el elemento externo de dos capas solo dispara las del interno. */
const TRIGGER_VARIANTS: Variants = { hidden: {}, visible: {} }

/** Máscara de la forma `rise`: el texto sube desde abajo de una línea que recorta. */
const MASK_STYLE: CSSProperties = { display: 'block', overflow: 'hidden', paddingBottom: '.1em' }

/** El elemento interno ocupa todo el ancho del externo. */
const BLOCK_STYLE: CSSProperties = { display: 'block' }

/** Props de {@link Reveal}. */
export interface RevealProps {
  /** Forma de aparecer. Por omisión `up`. */
  kind?: RevealKind
  /** Retardo antes de empezar, en milisegundos. Por omisión 0. */
  delay?: number
  /** Duración, en milisegundos. Por omisión `tokens.durations.reveal` (1000). */
  duration?: number
  /** Etiqueta del elemento. Por omisión `div`. */
  as?: MotionTag
  /** Clase del elemento externo (el que se observa). */
  className?: string
  /** Clase del elemento interno en las formas `rise` y `clip`, que animan una capa adentro. */
  contentClassName?: string
  /** Estilo del elemento externo. */
  style?: CSSProperties
  /** Contenido que aparece. */
  children?: ReactNode
}

/** Arma las variantes (oculto y visible, con su transición) de una forma. */
function buildVariants(kind: RevealKind, durationMs: number, delayMs: number): Variants {
  return {
    hidden: HIDDEN[kind],
    visible: {
      ...SHOWN[kind],
      transition: { duration: durationMs / 1000, delay: delayMs / 1000, ease: EASE_MAIN },
    },
  }
}

/**
 * Hace aparecer su contenido cuando entra en pantalla (una sola vez), con una de siete formas:
 * `up` (sube con desenfoque), `rise` (sube desde una máscara, para títulos), `fade`, `scale`,
 * `left`, `clip` (se descubre de arriba hacia abajo) y `bar` (barra que se estira desde la
 * izquierda; el origen de la transformación es `left`).
 *
 * `rise` y `clip` animan una capa interna y observan la externa, porque el contenido recortado
 * nunca se vería "entrar" en pantalla.
 *
 * Con `prefers-reduced-motion: reduce` (o sin `IntersectionObserver`) el contenido se muestra
 * ya en su estado final, sin fundido: nunca queda invisible.
 *
 * @param props - Ver {@link RevealProps}.
 * @throws {RangeError} Si `delay` o `duration` no son números mayores o iguales a 0.
 * @example
 * <Reveal kind="up" delay={120}><h2>Seis líneas para cada ronda</h2></Reveal>
 */
export function Reveal({
  kind = 'up',
  delay = 0,
  duration = tokens.durations.reveal,
  as = 'div',
  className,
  contentClassName,
  style,
  children,
}: RevealProps): ReactNode {
  assertNonNegative('delay', delay)
  assertNonNegative('duration', duration)
  const disabled = useRevealDisabled()
  const animatedRef = useRef<HTMLElement>(null)
  const layered = kind === 'rise' || kind === 'clip'
  const outerStyle: CSSProperties | undefined =
    kind === 'rise' ? { ...MASK_STYLE, ...style } : style

  if (disabled) {
    const Outer = as
    const Inner = INNER_TAGS[as]
    return (
      <Outer className={className} style={outerStyle}>
        {layered ? (
          <Inner className={contentClassName} style={BLOCK_STYLE}>
            {children}
          </Inner>
        ) : (
          children
        )}
      </Outer>
    )
  }

  const variants = buildVariants(kind, duration, delay)
  const Outer = MOTION_TAGS[as]
  if (layered) {
    const Inner = MOTION_TAGS[INNER_TAGS[as]]
    return (
      <MotionFeatures>
        <Outer
          className={className}
          style={outerStyle}
          variants={TRIGGER_VARIANTS}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <Inner className={contentClassName} style={BLOCK_STYLE} variants={variants}>
            {children}
          </Inner>
        </Outer>
      </MotionFeatures>
    )
  }
  return (
    <MotionFeatures>
      <Outer
        ref={animatedRef}
        className={className}
        style={kind === 'bar' ? { transformOrigin: 'left', ...style } : style}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        onAnimationComplete={() => {
          // `blur(0px)` deja un filtro permanente (capa propia y bloque contenedor de hijos fijos).
          animatedRef.current?.style.removeProperty('filter')
        }}
      >
        {children}
      </Outer>
    </MotionFeatures>
  )
}
