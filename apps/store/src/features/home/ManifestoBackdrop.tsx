'use client'

import type { ReactNode, RefObject } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import Image from 'next/image'
import { useRef } from 'react'
import { usePrefersReducedMotion } from '../../components/motion'

/** La foto del yerbal (1920 × 1072). */
const YERBAL_PHOTO = '/hero/world/yerbal.jpg'

/** La foto, decorativa: la frase del Manifiesto no la necesita. */
function YerbalPhoto(): ReactNode {
  return (
    <Image
      src={YERBAL_PHOTO}
      alt=""
      aria-hidden="true"
      fill
      loading="lazy"
      sizes="100vw"
      className="object-cover"
    />
  )
}

/** Props de {@link MovingPhoto}. */
interface MovingPhotoProps {
  /** El fondo entero, del tamaño de la sección: es lo que se mide contra la ventana. */
  target: RefObject<HTMLDivElement | null>
}

/** La foto con zoom lento al entrar y parallax mientras se ve. */
function MovingPhoto({ target }: MovingPhotoProps): ReactNode {
  // Entrada: de que asoma abajo a que llega arriba de la ventana.
  const { scrollYProgress: enter } = useScroll({ target, offset: ['start end', 'start start'] })
  // Parallax: todo el tiempo que la sección está a la vista.
  const { scrollYProgress: pass } = useScroll({ target, offset: ['start end', 'end start'] })
  const scale = useTransform(enter, [0, 1], [1.12, 1])
  const y = useTransform(pass, [0, 1], ['-6%', '6%'])
  return (
    <m.div
      data-manifesto-photo=""
      className="absolute inset-0"
      style={{ scale, y, willChange: 'transform' }}
    >
      <YerbalPhoto />
    </m.div>
  )
}

/**
 * Fondo del Manifiesto: la foto del yerbal a sangre y el velo que la oscurece para que la frase
 * se lea (un solo degradé de `background` del 90 % arriba al 55 % abajo: deja ver entre el 10 y el
 * 45 % de la foto). Medido a 1440 y a 390 px, el texto queda a 4,8:1 o más del pixel más claro de
 * su zona. Va adentro de una sección `relative overflow-hidden`, debajo del contenido (que lleva
 * `relative z-10`).
 *
 * Con movimiento la foto entra con un zoom lento (escala 1,12 → 1 mientras la sección sube hasta
 * el borde de arriba de la ventana) y hace parallax (`y` −6 % → 6 % mientras se ve); los dos
 * valores juntos nunca dejan ver un borde. Con `prefers-reduced-motion: reduce` queda quieta, sin
 * estilos en línea.
 */
export function ManifestoBackdrop(): ReactNode {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {reduced ? (
        <div data-manifesto-photo="" className="absolute inset-0">
          <YerbalPhoto />
        </div>
      ) : (
        <LazyMotion features={domAnimation}>
          <MovingPhoto target={ref} />
        </LazyMotion>
      )}
      <div
        data-manifesto-veil=""
        className="from-background/90 to-background/55 absolute inset-0 bg-linear-to-b"
      />
    </div>
  )
}
