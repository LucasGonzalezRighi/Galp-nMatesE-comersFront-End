'use client'

import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'
import { ManifestoBackdrop } from './ManifestoBackdrop'
import { ManifestoPinContext } from './ManifestoPhrase'

/**
 * Desde esta ventana la pantalla se clava: 1024 px de ancho y 640 de alto (más bajita, la frase del
 * Manifiesto y la banda no entran juntas en una pantalla). Si no, quedan apiladas.
 */
const PIN_QUERY = '(min-width: 1024px) and (min-height: 640px)'

/** Props de {@link PinnedManifesto}. */
export interface PinnedManifestoProps {
  /** El Manifiesto (`HomeManifesto`), sin fondo: la foto la pone este bloque. */
  manifesto: ReactNode
  /** La banda de cifras (`HomeStats`), pegada abajo del Manifiesto. */
  stats: ReactNode
  /** El bloque "Armá tu kit" (`HomeKit`), que sube por encima de la pantalla clavada. */
  kit: ReactNode
}

/** El Manifiesto y la banda clavados y el kit que los tapa (solo con movimiento y en escritorio). */
function PinnedLayers({ manifesto, stats, kit }: PinnedManifestoProps): ReactNode {
  const trackRef = useRef<HTMLDivElement>(null)
  const kitRef = useRef<HTMLDivElement>(null)
  // 0 cuando el kit asoma abajo de la ventana; 1 cuando su borde llega arriba y tapa la pantalla.
  const { scrollYProgress } = useScroll({ target: kitRef, offset: ['start end', 'start start'] })
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.45])
  return (
    <div ref={trackRef} className="relative">
      <m.div
        data-manifesto-block=""
        className="home-pin sticky top-0 z-0 flex h-svh flex-col overflow-hidden"
        style={{ opacity }}
      >
        <ManifestoBackdrop />
        {/* Clavada, la frase se ilumina con el recorrido de la pantalla, no con su propio lugar. */}
        <ManifestoPinContext value={trackRef}>
          <div className="relative flex min-h-0 flex-1 flex-col">{manifesto}</div>
        </ManifestoPinContext>
        <div className="relative">{stats}</div>
      </m.div>
      <div ref={kitRef} className="bg-background relative z-10">
        {kit}
      </div>
    </div>
  )
}

/**
 * El Manifiesto con la banda de cifras abajo, clavados, y el kit que sube (Lucas, 2026-10-29:
 * "cuando llega a la posición de la última foto, estático, y lo de abajo se superpone"): una
 * pantalla `sticky top-0` de `100svh` con el Manifiesto arriba (el alto que deja la banda, con el
 * texto centrado) y la banda de cifras pegada abajo, todo sobre la foto del yerbal
 * ({@link ManifestoBackdrop}, que cubre también la banda); "Armá tu kit", con fondo opaco, sube por
 * encima y, mientras la tapa, la pantalla clavada se atenúa de opacidad 1 a 0,45. La entrada del
 * Manifiesto (el zoom de la foto, la capa que se enciende, el texto que sube y la frase que se
 * ilumina, medida sobre este recorrido por `ManifestoPhrase`) termina antes de clavarse. Todo
 * sigue en el DOM y enfocable.
 *
 * Con `prefers-reduced-motion: reduce`, por debajo de 1024 px de ancho o de 640 px de alto quedan
 * apilados (el Manifiesto sobre la foto, la banda y el kit), sin clavar ni estilos en línea
 * (también en el servidor y en la hidratación).
 *
 * @param props - Ver {@link PinnedManifestoProps}.
 */
export function PinnedManifesto({ manifesto, stats, kit }: PinnedManifestoProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(PIN_QUERY)
  if (reduced || !wide) {
    return (
      <div className="relative">
        <div data-manifesto-block="" className="relative overflow-hidden">
          <ManifestoBackdrop />
          <div className="relative">{manifesto}</div>
          <div className="relative">{stats}</div>
        </div>
        <div>{kit}</div>
      </div>
    )
  }
  return (
    <LazyMotion features={domAnimation}>
      <PinnedLayers manifesto={manifesto} stats={stats} kit={kit} />
    </LazyMotion>
  )
}
