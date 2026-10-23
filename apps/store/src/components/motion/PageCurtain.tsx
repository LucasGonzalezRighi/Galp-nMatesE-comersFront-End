'use client'

import type { TargetAndTransition } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { m, useAnimationControls } from 'motion/react'
import { useCallback } from 'react'
import { EASE_CURTAIN } from './easing'
import { MotionFeatures } from './MotionFeatures'
import { SectionWatcher } from './route-watchers'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'

/** Recorrido de la cortina: sube desde abajo, se queda un momento y sale por arriba. */
const CURTAIN_SWEEP: TargetAndTransition = {
  y: ['100%', '0%', '0%', '-100%'],
  transition: { duration: 0.9, times: [0, 0.4, 0.55, 1], ease: EASE_CURTAIN },
}

/** Estilo de la cortina, igual al del diseño: fija, sobre todo, sin captar clics. */
const CURTAIN_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 85,
  pointerEvents: 'none',
  display: 'grid',
  placeItems: 'center',
  background:
    'radial-gradient(600px 400px at 50% 40%, var(--color-accent-800), transparent 70%), linear-gradient(180deg, var(--color-section), var(--color-background))',
}

/** Props de {@link PageCurtain}. */
export interface PageCurtainProps {
  /** Lo que se muestra en el centro de la cortina: el logo (con `alt=""`, es decorativo). */
  children?: ReactNode
}

/**
 * Cortina que cubre la pantalla con el logo cuando cambia la página (900 ms: sube, se queda y
 * sale por arriba). Se monta una sola vez en el layout. Aparece solo cuando cambia la sección (el
 * primer segmento del `pathname`: de `/tienda` a `/kit` sí, de `/tienda` a `/tienda/bombillones` no) y
 * no con los parámetros de búsqueda. Como lee `usePathname`, en el layout va dentro de un
 * `<Suspense>` (Cache Components). Es decorativa (`aria-hidden`) y no capta clics.
 *
 * Con `prefers-reduced-motion: reduce` no se dibuja.
 *
 * @param props - Ver {@link PageCurtainProps}.
 */
export function PageCurtain({ children }: PageCurtainProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const controls = useAnimationControls()
  const play = useCallback(() => {
    if (reduced) return
    void controls.start(CURTAIN_SWEEP)
  }, [controls, reduced])
  return (
    <MotionFeatures>
      <SectionWatcher onChange={play} />
      {reduced ? null : (
        <m.div aria-hidden="true" style={CURTAIN_STYLE} initial={{ y: '100%' }} animate={controls}>
          {children}
        </m.div>
      )}
    </MotionFeatures>
  )
}
