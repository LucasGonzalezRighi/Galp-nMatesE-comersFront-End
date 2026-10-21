'use client'

import type { ReactNode } from 'react'
import { MotionFeatures } from './MotionFeatures'
import { UpEnter } from './up-enter'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { useReplayCount } from './use-replay-count'

/** Props de {@link TabFade}. */
export interface TabFadeProps {
  /** Identifica la pestaña que se muestra. Cuando cambia, el contenido vuelve a entrar. */
  tabKey: number | string
  /** Clase del contenedor. */
  className?: string
  /** El contenido de la pestaña activa. */
  children?: ReactNode
}

/**
 * Contenedor del panel de una pestaña: cuando cambia `tabKey` el contenido vuelve a entrar
 * (sube 28 px y se desenfoca, 500 ms). La primera carga y `prefers-reduced-motion: reduce` no
 * animan.
 *
 * @param props - Ver {@link TabFadeProps}.
 */
export function TabFade({ tabKey, className, children }: TabFadeProps): ReactNode {
  const replays = useReplayCount(tabKey)
  const reduced = usePrefersReducedMotion()
  const animate = replays > 0 && !reduced
  return (
    <MotionFeatures>
      {animate ? (
        <UpEnter key={replays} delay={0} duration={500} className={className}>
          {children}
        </UpEnter>
      ) : (
        <div key={replays} className={className}>
          {children}
        </div>
      )}
    </MotionFeatures>
  )
}
