'use client'

import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'

/** Desde este ancho la grilla se despide con el scroll; en el celular queda quieta. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Props de {@link FeaturedExit}. */
export interface FeaturedExitProps {
  /** Clase de la grilla. */
  className?: string
  /** Las tarjetas de la grilla. */
  children: ReactNode
}

/** La grilla con la salida ligada al scroll (solo con movimiento y en escritorio). */
function ExitingGrid({ className, children }: FeaturedExitProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  // 0 cuando el pie de la grilla llega al 85 % de la ventana; 1 cuando pasa del 15 %.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['end 85%', 'end 15%'] })
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.3])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.96])
  const y = useTransform(scrollYProgress, [0, 1], [0, -32])
  return (
    <m.div
      ref={ref}
      className={className}
      style={{ opacity, scale, y, transformOrigin: 'top center', willChange: 'transform' }}
    >
      {children}
    </m.div>
  )
}

/**
 * Grilla de Destacados que se despide al salir de pantalla: mientras su pie sube del 85 % al 15 %
 * de la ventana pasa de opacidad 1 a 0,3, de escala 1 a 0,96 y sube 32 px, con el origen arriba.
 * Es un scrub (sin resorte): ir y volver con el scroll la arma y desarma igual.
 *
 * Con `prefers-reduced-motion: reduce` o por debajo de 1024 px se dibuja quieta, sin estilos en
 * línea (también en el servidor y en la hidratación, que no conocen la ventana).
 *
 * @param props - Ver {@link FeaturedExitProps}.
 */
export function FeaturedExit({ className, children }: FeaturedExitProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(DESKTOP_QUERY)
  if (reduced || !wide) return <div className={className}>{children}</div>
  return (
    <LazyMotion features={domAnimation}>
      <ExitingGrid className={className}>{children}</ExitingGrid>
    </LazyMotion>
  )
}
