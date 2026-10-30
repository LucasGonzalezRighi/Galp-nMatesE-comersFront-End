'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { MotionFeatures } from '../motion/MotionFeatures'
import { cx } from '../ui/cx'
import { footerWordShare } from './footer-rise'
import { useFooterMotion } from './FooterRise'

/** Clase de la capa iluminada: encima de la fantasma, con su mismo tamaño. */
const LIT_LAYER = 'absolute inset-0 block'

/**
 * Parte de la entrada de la palabra en que empieza a encenderse: la palabra entra por abajo con su
 * parte de arriba primero, así que si se encendiera desde el principio la luz subiría fuera de
 * pantalla. Desde el 60 % de la entrada, el borde de la luz se ve subir por la palabra.
 */
const LIT_FROM = 0.6

/**
 * Recorte de la capa iluminada según el avance de la entrada de la palabra (0 a 1): se enciende de
 * {@link LIT_FROM} a 1 con `inset(calc((1 − lit) × 100 %) 0 0 0)`, así se ve de abajo hacia arriba.
 */
function litClipPath(progress: number): string {
  const lit = Math.min(1, Math.max(0, (progress - LIT_FROM) / (1 - LIT_FROM)))
  return `inset(${String((1 - lit) * 100)}% 0 0 0)`
}

/** Props de {@link FooterWordmark}. */
export interface FooterWordmarkProps {
  /** La palabra fantasma, la de siempre. */
  ghost: ReactNode
  /** La palabra iluminada, del mismo tamaño, que se dibuja encima. */
  lit: ReactNode
  /** Clases del marco (el margen y el apilado respecto de las columnas). */
  className?: string
}

/** La palabra que se ilumina y sube con el scroll mientras entra en pantalla. */
function ScrollLitWordmark({ ghost, lit, className }: FooterWordmarkProps): ReactNode {
  const frame = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['24%', '0%'])
  const clipPath = useTransform(scrollYProgress, litClipPath)
  return (
    <m.div
      ref={frame}
      aria-hidden="true"
      className={cx('relative will-change-transform', className)}
      style={{ y }}
    >
      <span data-wordmark-layer="ghost" className="block">
        {ghost}
      </span>
      <m.span data-wordmark-layer="lit" className={LIT_LAYER} style={{ clipPath }}>
        {lit}
      </m.span>
    </m.div>
  )
}

/** La palabra que sube última con el pie, mientras pasa por encima de las reseñas quietas. */
function RisingWordmark({
  ghost,
  lit,
  className,
  cover,
}: FooterWordmarkProps & { cover: MotionValue<number> }): ReactNode {
  const share = useTransform(cover, footerWordShare)
  const y = useTransform(share, (value) => `${String((1 - value) * 55)}%`)
  const clipPath = useTransform(share, (value) => `inset(${String((1 - value) * 100)}% 0 0 0)`)
  return (
    <m.div
      aria-hidden="true"
      className={cx('relative will-change-transform', className)}
      style={{ y, opacity: share }}
    >
      <span data-wordmark-layer="ghost" className="block">
        {ghost}
      </span>
      <m.span data-wordmark-layer="lit" className={LIT_LAYER} style={{ clipPath }}>
        {lit}
      </m.span>
    </m.div>
  )
}

/**
 * La palabra GALPÓN gigante del pie, con dos capas superpuestas: la fantasma de siempre y una
 * iluminada que se enciende de abajo hacia arriba (`clip-path`). Cómo entra depende del modo del
 * pie (`FooterRise`):
 *
 * - `rise` (el pie sube por encima de las reseñas quietas del inicio): llega última, pegada a la
 *   subida del pie (`footerWordShare`, de la mitad al final): sube del 55 % de su alto a su lugar,
 *   pasa de transparente a opaca y se enciende en el mismo tramo.
 * - `scroll` (las demás páginas en escritorio): mientras entra en pantalla (`useScroll` sobre la
 *   propia palabra, de `start end` a `end end`) sube del 24 % de su alto a su lugar y la luz
 *   arranca en el 60 % de esa entrada (`LIT_FROM`).
 * - `still` (menos movimiento o celular): la iluminada queda quieta y entera, sin recorte.
 *
 * Es decorativa (`aria-hidden`). Sin JavaScript se ve la fantasma con la iluminada entera encima.
 *
 * @param props - Ver {@link FooterWordmarkProps}.
 */
export function FooterWordmark(props: FooterWordmarkProps): ReactNode {
  const { mode, cover } = useFooterMotion()
  if (mode === 'rise' && cover !== null) {
    return <RisingWordmark {...props} cover={cover} />
  }
  if (mode === 'scroll') {
    return (
      <MotionFeatures>
        <ScrollLitWordmark {...props} />
      </MotionFeatures>
    )
  }
  return (
    <div aria-hidden="true" className={cx('relative', props.className)}>
      <span data-wordmark-layer="ghost" className="block">
        {props.ghost}
      </span>
      <span data-wordmark-layer="lit" className={LIT_LAYER}>
        {props.lit}
      </span>
    </div>
  )
}
