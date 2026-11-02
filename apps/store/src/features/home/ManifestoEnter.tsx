'use client'

import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'

/** Desde este ancho el texto entra con el scroll; en el celular queda quieto. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Props de {@link ManifestoEnter}. */
export interface ManifestoEnterProps {
  /** Clase del bloque de texto. */
  className?: string
  /** El rótulo, la frase y el link del Manifiesto. */
  children: ReactNode
}

/** El bloque con la entrada ligada al scroll (solo con movimiento y en escritorio). */
function EnteringBlock({ className, children }: ManifestoEnterProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  // 0 cuando el bloque asoma al 90 % de la ventana; 1 cuando su borde de arriba llega al 35 %.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 90%', 'start 35%'] })
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])
  const y = useTransform(scrollYProgress, [0, 1], [96, 0])
  return (
    <m.div ref={ref} className={className} style={{ opacity, y, willChange: 'transform' }}>
      {children}
    </m.div>
  )
}

/**
 * El texto del Manifiesto que entra con el scroll (Lucas, 2026-10-29: con solo `Reveal` no se
 * notaba): mientras su borde de arriba sube del 90 % al 35 % de la ventana, el bloque pasa de
 * opacidad 0 a 1 y sube de 96 px a su lugar, a la par de la foto que se enciende
 * (`ManifestoBackdrop`). Es un scrub (sin resorte): ir y volver con el scroll lo arma y desarma
 * igual. Solo `transform` y `opacity`.
 *
 * Con `prefers-reduced-motion: reduce` o por debajo de 1024 px se dibuja quieto, sin estilos en
 * línea (también en el servidor y en la hidratación, que no conocen la ventana).
 *
 * @param props - Ver {@link ManifestoEnterProps}.
 */
export function ManifestoEnter({ className, children }: ManifestoEnterProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(DESKTOP_QUERY)
  if (reduced || !wide) return <div className={className}>{children}</div>
  return (
    <LazyMotion features={domAnimation}>
      <EnteringBlock className={className}>{children}</EnteringBlock>
    </LazyMotion>
  )
}
