'use client'

import type { ReactNode } from 'react'
import { Children } from 'react'
import { MotionFeatures } from './MotionFeatures'
import { UpEnter } from './up-enter'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { useReplayCount } from './use-replay-count'
import { assertNonNegative } from './validate'

/** Retardo entre una tarjeta y la siguiente, en milisegundos. */
export const GRID_STEP_MS = 45

/** Cantidad de tarjetas que se escalonan; las siguientes entran junto con la última. */
const MAX_STAGGERED = 10

/** Props de {@link GridReplay}. */
export interface GridReplayProps {
  /**
   * Identifica lo que muestra la grilla (por ejemplo, el filtro y el orden juntos). Cuando cambia,
   * las tarjetas vuelven a entrar. La primera carga no se anima.
   */
  replayKey: number | string
  /** Retardo entre tarjetas, en milisegundos. Por omisión 45. */
  step?: number
  /** Clase del contenedor (la grilla). */
  className?: string
  /** Las tarjetas. Cada una queda dentro de un `div` que pasa a ser el ítem de la grilla. */
  children?: ReactNode
}

/**
 * Grilla cuyas tarjetas vuelven a aparecer una tras otra (45 ms entre cada una, hasta la décima)
 * cuando cambia `replayKey`, por ejemplo al filtrar u ordenar la tienda. Cada tarjeta entra como
 * `Reveal` `up`: sube 28 px con desenfoque en 700 ms.
 *
 * Las tarjetas se vuelven a montar al repetirse; es lo esperado, porque el contenido cambió. La
 * primera carga y `prefers-reduced-motion: reduce` no animan.
 *
 * @param props - Ver {@link GridReplayProps}.
 * @throws {RangeError} Si `step` no es un número mayor o igual a 0.
 */
export function GridReplay({
  replayKey,
  step = GRID_STEP_MS,
  className,
  children,
}: GridReplayProps): ReactNode {
  assertNonNegative('step', step)
  const replays = useReplayCount(replayKey)
  const reduced = usePrefersReducedMotion()
  const animate = replays > 0 && !reduced
  return (
    <MotionFeatures>
      <div className={className}>
        {Children.toArray(children).map((child, index) => {
          const key = `${String(replays)}-${String(index)}`
          return animate ? (
            <UpEnter key={key} delay={Math.min(index, MAX_STAGGERED) * step} duration={700}>
              {child}
            </UpEnter>
          ) : (
            <div key={key}>{child}</div>
          )
        })}
      </div>
    </MotionFeatures>
  )
}
