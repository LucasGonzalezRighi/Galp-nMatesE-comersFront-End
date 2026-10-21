'use client'

import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { m, useMotionValue, useSpring } from 'motion/react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertNonNegative } from './validate'

/** Resorte con que sigue al mouse: responde rápido (unos 180 ms) y vuelve a su sitio con suavidad. */
const TILT_SPRING = { stiffness: 260, damping: 26, mass: 0.6 } as const

/** Inclinación por omisión: 10, el valor del diseño. */
const DEFAULT_MAX = 10

/** Perspectiva por omisión, en píxeles. */
const DEFAULT_PERSPECTIVE = 1000

/** Ángulos de inclinación, en grados, en cada eje. */
export interface TiltAngles {
  /** Giro alrededor del eje horizontal (cabeceo): positivo cuando el mouse está arriba. */
  rotateX: number
  /** Giro alrededor del eje vertical: positivo cuando el mouse está a la derecha. */
  rotateY: number
}

/**
 * Calcula cuánto se inclina un elemento según dónde está el mouse. Es la fórmula del diseño:
 * `max` es el recorrido total, así que en cada borde la inclinación llega a `max / 2` y en el
 * centro es 0.
 *
 * @param x - Posición horizontal del mouse dentro del elemento, de 0 (izquierda) a 1 (derecha).
 * @param y - Posición vertical del mouse dentro del elemento, de 0 (arriba) a 1 (abajo).
 * @param max - Recorrido total de la inclinación, en grados.
 * @returns Los giros en `rotateX` y `rotateY`; las posiciones fuera de 0 a 1 se recortan.
 * @throws {RangeError} Si `x`, `y` o `max` no son números finitos, o si `max` es negativo.
 * @example
 * tiltAngles(1, 0, 10) // { rotateX: 5, rotateY: 5 }
 */
export function tiltAngles(x: number, y: number, max: number): TiltAngles {
  assertNonNegative('max', max)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError(
      `La posición del mouse tiene que ser finita; se recibió ${String(x)}, ${String(y)}.`,
    )
  }
  const clamp = (value: number): number => Math.min(1, Math.max(0, value))
  return { rotateX: (0.5 - clamp(y)) * max, rotateY: (clamp(x) - 0.5) * max }
}

/** Props de {@link Tilt}. */
export interface TiltProps {
  /** Recorrido total de la inclinación, en grados. Por omisión 10 (±5° en los bordes). */
  max?: number
  /** Perspectiva, en píxeles. Por omisión 1000. */
  perspective?: number
  /** Clase del contenedor. */
  className?: string
  /** Estilo del contenedor. */
  style?: CSSProperties
  /** Contenido que se inclina. */
  children?: ReactNode
}

/**
 * Inclina su contenido en 3D siguiendo al mouse. Solo responde a un mouse (`pointerType ===
 * 'mouse'`): con el dedo o el lápiz no hace nada. Al soltar el mouse vuelve a su lugar.
 *
 * Mientras el mouse está encima publica variables CSS en el contenedor para efectos de brillo
 * dentro de la tarjeta: `--hov` (1 o 0), `--mx` y `--my` (posición en %, de 0 a 100) y `--px` y
 * `--py` (posición centrada, de -0,5 a 0,5).
 *
 * Con `prefers-reduced-motion: reduce` no se inclina.
 *
 * @param props - Ver {@link TiltProps}.
 * @throws {RangeError} Si `max` o `perspective` no son números mayores o iguales a 0.
 */
export function Tilt({
  max = DEFAULT_MAX,
  perspective = DEFAULT_PERSPECTIVE,
  className,
  style,
  children,
}: TiltProps): ReactNode {
  assertNonNegative('max', max)
  assertNonNegative('perspective', perspective)
  const reduced = usePrefersReducedMotion()
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const rotateX = useSpring(targetX, TILT_SPRING)
  const rotateY = useSpring(targetY, TILT_SPRING)

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType !== 'mouse') return
    const element = event.currentTarget
    // Se mide el padre: el elemento, al girar, cambia de caja y haría temblar la inclinación.
    const box = (element.parentElement ?? element).getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return
    const x = (event.clientX - box.left) / box.width
    const y = (event.clientY - box.top) / box.height
    const angles = tiltAngles(x, y, max)
    targetX.set(angles.rotateX)
    targetY.set(angles.rotateY)
    element.style.setProperty('--hov', '1')
    element.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    element.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    element.style.setProperty('--px', (x - 0.5).toFixed(3))
    element.style.setProperty('--py', (y - 0.5).toFixed(3))
  }

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>): void => {
    targetX.set(0)
    targetY.set(0)
    event.currentTarget.style.setProperty('--hov', '0')
    event.currentTarget.style.setProperty('--px', '0')
    event.currentTarget.style.setProperty('--py', '0')
  }

  return (
    <MotionFeatures>
      <m.div
        className={className}
        style={{ ...style, rotateX, rotateY, transformPerspective: perspective }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        {children}
      </m.div>
    </MotionFeatures>
  )
}
