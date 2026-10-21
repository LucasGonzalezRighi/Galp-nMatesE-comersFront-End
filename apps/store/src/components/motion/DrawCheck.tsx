'use client'

import type { ReactNode } from 'react'
import { m } from 'motion/react'
import { EASE_DRAW } from './easing'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertNonNegative } from './validate'

/** Forma del tilde dentro del círculo, en una cuadrícula de 72 por 72. */
const CHECK_PATH = 'M22 37l10 10 19-21'

/** Props de {@link DrawCheck}. */
export interface DrawCheckProps {
  /** Lado del dibujo, en píxeles. Por omisión 72. */
  size?: number
  /** Color del trazo: cualquier color CSS. Por omisión el de acento. */
  color?: string
  /** Texto para lectores de pantalla. Si falta, el dibujo se considera decorativo. */
  label?: string
  /** Clase del `svg`. */
  className?: string
}

/**
 * Check dentro de un círculo que se dibuja solo (900 ms, con 250 ms de retraso), para las
 * confirmaciones. Con `prefers-reduced-motion: reduce` aparece ya dibujado.
 *
 * @param props - Ver {@link DrawCheckProps}.
 * @throws {RangeError} Si `size` no es un número mayor o igual a 0.
 */
export function DrawCheck({
  size = 72,
  color = 'var(--color-accent)',
  label,
  className,
}: DrawCheckProps): ReactNode {
  assertNonNegative('size', size)
  const reduced = usePrefersReducedMotion()
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 72 72',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    ...(label === undefined
      ? { 'aria-hidden': true as const }
      : { role: 'img' as const, 'aria-label': label }),
  } as const

  if (reduced) {
    return (
      <svg {...common}>
        <circle cx="36" cy="36" r="34" />
        <path d={CHECK_PATH} />
      </svg>
    )
  }
  const draw = { duration: 0.9, delay: 0.25, ease: EASE_DRAW }
  return (
    <MotionFeatures>
      <svg {...common}>
        <m.circle
          cx="36"
          cy="36"
          r="34"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={draw}
        />
        <m.path
          d={CHECK_PATH}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={draw}
        />
      </svg>
    </MotionFeatures>
  )
}
