'use client'

import type { CSSProperties, ReactNode } from 'react'
import { m, useMotionValue, useSpring } from 'motion/react'
import { useEffect } from 'react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertFinite } from './validate'

/** Resorte lento: el desplazamiento persigue al mouse con una cola de unos 250 ms. */
const PARALLAX_SPRING = { stiffness: 60, damping: 18, mass: 0.6 } as const

/** Props de {@link MouseParallax}. */
export interface MouseParallaxProps {
  /**
   * Desplazamiento máximo, en píxeles, entre el mouse en un borde y en el otro de la ventana. Un
   * valor negativo mueve el contenido al revés (el diseño usa -30). Por omisión 30.
   */
  strength?: number
  /** Clase del contenedor. */
  className?: string
  /** Estilo del contenedor. */
  style?: CSSProperties
  /** Contenido que se desplaza. */
  children?: ReactNode
}

/**
 * Desplaza su contenido levemente según dónde esté el mouse en la ventana (parallax). Solo
 * responde a un mouse. Con `prefers-reduced-motion: reduce` queda quieto.
 *
 * @param props - Ver {@link MouseParallaxProps}.
 * @throws {RangeError} Si `strength` no es un número finito.
 */
export function MouseParallax({
  strength = 30,
  className,
  style,
  children,
}: MouseParallaxProps): ReactNode {
  assertFinite('strength', strength)
  const reduced = usePrefersReducedMotion()
  const targetX = useMotionValue(0)
  const targetY = useMotionValue(0)
  const x = useSpring(targetX, PARALLAX_SPRING)
  const y = useSpring(targetY, PARALLAX_SPRING)

  useEffect(() => {
    if (reduced) return
    const onMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      targetX.set((event.clientX / window.innerWidth - 0.5) * strength)
      targetY.set((event.clientY / window.innerHeight - 0.5) * strength)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
    }
  }, [reduced, strength, targetX, targetY])

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
  return (
    <MotionFeatures>
      <m.div className={className} style={{ ...style, x, y }}>
        {children}
      </m.div>
    </MotionFeatures>
  )
}
