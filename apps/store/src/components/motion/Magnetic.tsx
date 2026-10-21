'use client'

import type { PointerEvent, ReactNode } from 'react'
import { m, useMotionValue, useSpring } from 'motion/react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertNonNegative } from './validate'

/** Resorte elástico (rebota un poco al pasar), como la curva `spring` del diseño. */
const MAGNET_SPRING = { stiffness: 300, damping: 17, mass: 0.5 } as const

/** Props de {@link Magnetic}. */
export interface MagneticProps {
  /** Cuánto sigue el contenido al mouse: la fracción de la distancia al centro. Por omisión 0,3. */
  strength?: number
  /** Píxeles de margen alrededor del contenido donde ya se siente el imán. Por omisión 12. */
  reach?: number
  /** Clase del contenedor externo. */
  className?: string
  /** El contenido que se mueve (un botón o un enlace). */
  children?: ReactNode
}

/**
 * Hace que su contenido (un botón o enlace) se corra hacia el mouse cuando se acerca, como un
 * imán, y vuelva a su lugar con un rebote al alejarse. Solo responde a un mouse.
 *
 * El contenedor se agranda `reach` píxeles hacia cada lado (con un margen negativo del mismo
 * tamaño) para que el imán se sienta antes de tocar el contenido, sin cambiar el diseño.
 *
 * Con `prefers-reduced-motion: reduce` el contenido no se mueve.
 *
 * @param props - Ver {@link MagneticProps}.
 * @throws {RangeError} Si `strength` o `reach` no son números mayores o iguales a 0.
 */
export function Magnetic({
  strength = 0.3,
  reach = 12,
  className,
  children,
}: MagneticProps): ReactNode {
  assertNonNegative('strength', strength)
  assertNonNegative('reach', reach)
  const reduced = usePrefersReducedMotion()
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const x = useSpring(targetX, MAGNET_SPRING)
  const y = useSpring(targetY, MAGNET_SPRING)
  const wrapperStyle = {
    display: 'inline-flex',
    alignSelf: 'flex-start',
    padding: reach,
    margin: -reach,
  } as const

  if (reduced) {
    return (
      <span className={className} style={wrapperStyle}>
        {children}
      </span>
    )
  }

  const onPointerMove = (event: PointerEvent<HTMLSpanElement>): void => {
    if (event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    targetX.set((event.clientX - box.left - box.width / 2) * strength)
    targetY.set((event.clientY - box.top - box.height / 2) * strength)
  }

  const onPointerLeave = (): void => {
    targetX.set(0)
    targetY.set(0)
  }

  return (
    <MotionFeatures>
      <span
        className={className}
        style={wrapperStyle}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <m.span style={{ display: 'inline-flex', x, y }}>{children}</m.span>
      </span>
    </MotionFeatures>
  )
}
