'use client'

import type { CSSProperties, ReactNode } from 'react'
import { m } from 'motion/react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertNonNegative } from './validate'

/** Tope de movimiento de un `Float`, en milisegundos (WCAG 2.2.2: 5 s o menos). */
const MAX_MOTION_MS = 5000

/**
 * Cuántas veces se repite el vaivén después del primero para moverse 5 s como máximo:
 * `max(0, floor(5000 / duration) - 1)`. Con los 4200 ms por omisión, ninguna: un solo ciclo.
 *
 * @param duration - Duración de un ciclo, en milisegundos, mayor que 0.
 * @returns Las repeticiones, un entero de 0 en adelante.
 * @throws {RangeError} Si `duration` no es un número finito mayor que 0.
 * @example
 * floatRepeat(4200) // 0
 * floatRepeat(2400) // 1
 */
export function floatRepeat(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError(
      `duration tiene que ser un número mayor que 0 (recibió ${String(duration)})`,
    )
  }
  return Math.max(0, Math.floor(MAX_MOTION_MS / duration) - 1)
}

/** Props de {@link Float}. */
export interface FloatProps {
  /** Cuántos píxeles sube. Por omisión 9, como en el diseño. */
  distance?: number
  /** Duración de un ciclo completo (sube y baja), en milisegundos. Por omisión 4200. */
  duration?: number
  /** Retardo antes del primer ciclo, en milisegundos. Sirve para desfasar varios `Float`. */
  delay?: number
  /** Clase del contenedor. */
  className?: string
  /** Estilo del contenedor. */
  style?: CSSProperties
  /** Contenido que flota. */
  children?: ReactNode
}

/**
 * Hace flotar su contenido con un vaivén suave (sube `distance` píxeles y vuelve), 5 s como
 * máximo ({@link floatRepeat}, WCAG 2.2.2), y queda quieto en su lugar. Para varias ilustraciones
 * juntas conviene variar `duration` y `delay` y que no se muevan al unísono (el diseño usa 4200,
 * 4900 y 5600 ms).
 *
 * Con `prefers-reduced-motion: reduce` queda quieto.
 *
 * @param props - Ver {@link FloatProps}.
 * @throws {RangeError} Si `distance`, `duration` o `delay` no son números mayores o iguales a 0.
 */
export function Float({
  distance = 9,
  duration = 4200,
  delay = 0,
  className,
  style,
  children,
}: FloatProps): ReactNode {
  assertNonNegative('distance', distance)
  assertNonNegative('duration', duration)
  assertNonNegative('delay', delay)
  const reduced = usePrefersReducedMotion()
  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
  return (
    <MotionFeatures>
      <m.div
        className={className}
        style={style}
        animate={{ y: [0, -distance, 0] }}
        transition={{
          duration: duration / 1000,
          delay: delay / 1000,
          repeat: duration === 0 ? 0 : floatRepeat(duration),
          ease: 'easeInOut',
        }}
      >
        {children}
      </m.div>
    </MotionFeatures>
  )
}
