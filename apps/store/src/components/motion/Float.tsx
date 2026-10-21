'use client'

import type { CSSProperties, ReactNode } from 'react'
import { m } from 'motion/react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertNonNegative } from './validate'

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
 * Hace flotar su contenido con un vaivén suave y continuo (sube `distance` píxeles y vuelve).
 * Para varias ilustraciones juntas conviene variar `duration` y `delay` y que no se muevan al
 * unísono (el diseño usa 4200, 4900 y 5600 ms).
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
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {children}
      </m.div>
    </MotionFeatures>
  )
}
