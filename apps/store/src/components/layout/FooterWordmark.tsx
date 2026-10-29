'use client'

import type { ReactNode } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { usePrefersReducedMotion } from '../motion'
import { MotionFeatures } from '../motion/MotionFeatures'
import { cx } from '../ui/cx'

/** Clase de la capa iluminada: encima de la fantasma, con su mismo tamaño. */
const LIT_LAYER = 'absolute inset-0 block'

/**
 * Recorte de la capa iluminada según cuánto se encendió: `inset(calc((1 − lit) × 100 %) 0 0 0)`,
 * así se ve de abajo hacia arriba.
 */
function litClipPath(lit: number): string {
  const clamped = Math.min(1, Math.max(0, lit))
  return `inset(${String((1 - clamped) * 100)}% 0 0 0)`
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

/** La palabra que se ilumina y sube con el scroll por el pie. */
function ScrollLitWordmark({ ghost, lit, className }: FooterWordmarkProps): ReactNode {
  const footer = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: footer, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['24%', '0%'])
  const clipPath = useTransform(scrollYProgress, litClipPath)
  return (
    <m.div
      ref={(node: HTMLDivElement | null) => {
        footer.current = node?.closest('footer') ?? null
      }}
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

/**
 * La palabra GALPÓN gigante del pie, con dos capas superpuestas: la fantasma de siempre y una
 * iluminada que se enciende de abajo hacia arriba (`clip-path`) mientras el pie entra en pantalla
 * (`useScroll` sobre el `footer`, de `start end` a `end end`); a la vez la palabra sube del 24 % de
 * su alto a su lugar. Es decorativa (`aria-hidden`).
 *
 * Con `prefers-reduced-motion: reduce` la iluminada queda quieta y entera, sin recorte. Sin
 * JavaScript se ve la fantasma.
 *
 * @param props - Ver {@link FooterWordmarkProps}.
 */
export function FooterWordmark(props: FooterWordmarkProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  if (reduced) {
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
  return (
    <MotionFeatures>
      <ScrollLitWordmark {...props} />
    </MotionFeatures>
  )
}
