'use client'

import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'

/** Desde este ancho la banda se clava; en el celular las dos secciones quedan apiladas. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Props de {@link PinnedStats}. */
export interface PinnedStatsProps {
  /** La banda de cifras (`HomeStats`). */
  stats: ReactNode
  /** El bloque "Armá tu kit" (`HomeKit`), que sube por encima de la banda. */
  kit: ReactNode
}

/** La banda clavada y el kit que la tapa (solo con movimiento y en escritorio). */
function PinnedLayers({ stats, kit }: PinnedStatsProps): ReactNode {
  const kitRef = useRef<HTMLDivElement>(null)
  // 0 cuando el kit asoma abajo de la ventana; 1 cuando su borde llega arriba y tapa la banda.
  const { scrollYProgress } = useScroll({ target: kitRef, offset: ['start end', 'start start'] })
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.45])
  return (
    <div className="relative">
      <m.div className="sticky top-0 z-0" style={{ opacity }}>
        {stats}
      </m.div>
      <div ref={kitRef} className="bg-background relative z-10">
        {kit}
      </div>
    </div>
  )
}

/**
 * Cifras clavadas y el kit que sube: la banda de cifras queda quieta al llegar arriba
 * (`sticky top-0`, debajo del encabezado fijo, que la tapa de a poco) y "Armá tu kit", con fondo
 * opaco, sube por encima; mientras la tapa, la banda se atenúa de opacidad 1 a 0,45. Todo sigue
 * en el DOM y enfocable.
 *
 * Con `prefers-reduced-motion: reduce` o por debajo de 1024 px las dos secciones quedan apiladas,
 * sin clavar ni estilos en línea (también en el servidor y en la hidratación).
 *
 * @param props - Ver {@link PinnedStatsProps}.
 */
export function PinnedStats({ stats, kit }: PinnedStatsProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(DESKTOP_QUERY)
  if (reduced || !wide) {
    return (
      <div className="relative">
        <div>{stats}</div>
        <div>{kit}</div>
      </div>
    )
  }
  return (
    <LazyMotion features={domAnimation}>
      <PinnedLayers stats={stats} kit={kit} />
    </LazyMotion>
  )
}
