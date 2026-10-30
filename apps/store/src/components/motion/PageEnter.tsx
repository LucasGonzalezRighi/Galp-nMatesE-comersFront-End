'use client'

import type { ReactNode } from 'react'
import { m, useAnimationControls } from 'motion/react'
import { useCallback, useRef } from 'react'
import { EASE_MAIN } from './easing'
import { MotionFeatures } from './MotionFeatures'
import { RouteWatcher } from './route-watchers'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/** Estado desde el que entra el contenido: transparente, 24 px más abajo y desenfocado. */
const ENTER_FROM = { opacity: 0, y: 24, filter: 'blur(6px)' } as const

/** Entrada del contenido: 800 ms, con 180 ms de retraso, con la curva principal. */
const ENTER_TO = {
  opacity: 1,
  y: 0,
  filter: 'blur(0px)',
  transition: { duration: 0.8, delay: 0.18, ease: EASE_MAIN },
} as const

/**
 * Atributo de `<html>` con que otra transición avisa que tapa la pantalla al cambiar de página (el
 * telón de la intro, Ruling MR-29): mientras está, {@link PageEnter} no hace su entrada, así el
 * telón se abre sobre la página nueva ya nítida y no sobre una transparente.
 */
export const PAGE_COVERED_ATTRIBUTE = 'data-page-covered'

/** Props de {@link PageEnter}. */
export interface PageEnterProps {
  /** El contenido de la página. */
  children: ReactNode
  /** Clase del contenedor. */
  className?: string
}

/**
 * Envuelve el contenido de la página y lo hace entrar (desenfoque y 24 px, 800 ms, con 180 ms de
 * retraso) cada vez que cambia el `pathname` o los parámetros de búsqueda, también si cambia solo
 * un parámetro. El contenido no se vuelve a montar: conserva su estado.
 *
 * No anima la primera carga (el HTML del servidor se ve de inmediato, sin esperar a la
 * hidratación), con `prefers-reduced-motion: reduce` ni cuando el telón tapa la pantalla
 * ({@link PAGE_COVERED_ATTRIBUTE}).
 *
 * @param props - Ver {@link PageEnterProps}.
 */
export function PageEnter({ children, className }: PageEnterProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const controls = useAnimationControls()
  const ref = useRef<HTMLDivElement>(null)
  const play = useCallback(() => {
    if (reduced || document.documentElement.hasAttribute(PAGE_COVERED_ATTRIBUTE)) return
    controls.set(ENTER_FROM)
    void controls.start(ENTER_TO)
  }, [controls, reduced])
  return (
    <MotionFeatures>
      <RouteWatcher onChange={play} />
      <m.div
        ref={ref}
        className={className}
        initial={false}
        animate={controls}
        onAnimationComplete={() => {
          // `blur(0px)` deja un filtro permanente (capa propia y bloque contenedor de hijos fijos).
          ref.current?.style.removeProperty('filter')
        }}
      >
        {children}
      </m.div>
    </MotionFeatures>
  )
}
