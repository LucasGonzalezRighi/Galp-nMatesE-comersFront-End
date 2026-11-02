'use client'

import type { ReactNode } from 'react'
import { m } from 'motion/react'
import { useRef } from 'react'
import { EASE_MAIN } from './easing'

/** Props de {@link UpEnter}. */
interface UpEnterProps {
  /** Retardo antes de empezar, en milisegundos. */
  delay: number
  /** Duración, en milisegundos. */
  duration: number
  /** Clase del contenedor. */
  className?: string
  /** El contenido que entra. */
  children: ReactNode
}

/**
 * Contenedor que, al montarse, entra como `Reveal` `up` (sube 28 px y se desenfoca) sin esperar a
 * aparecer en pantalla. Es lo que usan {@link GridReplay} y {@link TabFade} para repetir la
 * entrada cuando cambia su contenido. Al terminar quita el filtro, que si no quedaría puesto.
 *
 * @param props - Ver `UpEnterProps`.
 */
export function UpEnter({ delay, duration, className, children }: UpEnterProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: duration / 1000, delay: delay / 1000, ease: EASE_MAIN }}
      onAnimationComplete={() => {
        ref.current?.style.removeProperty('filter')
      }}
    >
      {children}
    </m.div>
  )
}
