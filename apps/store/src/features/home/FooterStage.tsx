'use client'

import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import {
  clampCover,
  easeInOutSine,
  registerFooterHome,
  registerFooterStage,
} from '../../components/layout/footer-rise'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'

/** Desde este ancho las reseñas quedan quietas y el pie sube por encima (como `footer.css`). */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** Props de {@link FooterStage}. */
export interface FooterStageProps {
  /** Las reseñas (`HomeReviews`), el cierre del inicio. */
  children: ReactNode
}

/** Las reseñas clavadas, que se desenfocan y oscurecen mientras el pie las tapa. */
function PinnedReviews({ children }: FooterStageProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  // El pie sube por encima (margen negativo en `footer.css`) mientras dure el recorrido extra.
  useEffect(() => registerFooterStage(), [])
  // 0 cuando el escenario llega arriba (el pie asoma abajo); 1 al final: el recorrido extra mide
  // lo mismo que el pie, así que es cuánto lo tapó.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const cover = useTransform(scrollYProgress, (value) => easeInOutSine(clampCover(value)))
  const scale = useTransform(cover, [0, 1], [1, 0.97])
  // Nítidas del todo, sin filtro: un `blur(0px)` igual le costaría una capa al navegador.
  const filter = useTransform(cover, (value) =>
    value < 0.0005 ? 'none' : `blur(${String(value * 4)}px) brightness(${String(1 - value * 0.5)})`,
  )
  return (
    <div
      ref={ref}
      data-footer-stage=""
      className="relative"
      style={{ height: 'calc(100svh + var(--footer-h, 0px))' }}
    >
      <m.div
        className="sticky top-0 flex h-svh origin-[50%_40%] flex-col justify-center"
        style={{ scale, filter }}
      >
        {children}
      </m.div>
    </div>
  )
}

/**
 * Las reseñas quietas mientras el pie sube por encima, como Contacto en el portafolio de Lucas: un
 * bloque `sticky top-0` de una pantalla, con el contenido centrado, y un recorrido extra igual al
 * alto del pie (`--footer-h`, que publica `FooterRise`); el pie, con margen negativo, las tapa en
 * ese tramo (`footer.css`). Mientras las tapa, las reseñas se desenfocan y oscurecen (`blur` de 0 a
 * 4 px, `brightness` de 1 a 0,5 y escala de 1 a 0,97, con la curva senoidal), pegado al scroll.
 * Avisa al pie que tiene que subir (`registerFooterStage`, que marca `<html>` con
 * `data-footer-rise`: eso activa el margen negativo del pie) y lleva `data-footer-stage`. En
 * cualquier ancho avisa además que es el inicio (`registerFooterHome`): el pie no es el sutil de las
 * demás páginas. Las dos marcas se van con los efectos, también cuando el inicio queda oculto.
 *
 * Con `prefers-reduced-motion: reduce` o por debajo de 1024 px las reseñas quedan en su lugar, sin
 * clavar ni estilos en línea, y el pie va debajo (también en el servidor y en la hidratación).
 *
 * @param props - Ver {@link FooterStageProps}.
 */
export function FooterStage({ children }: FooterStageProps): ReactNode {
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(DESKTOP_QUERY)
  // El pie del inicio, en cualquier ancho, no es el sutil de las demás páginas.
  useEffect(() => registerFooterHome(), [])
  if (reduced || !wide) return <div>{children}</div>
  return (
    <LazyMotion features={domAnimation}>
      <PinnedReviews>{children}</PinnedReviews>
    </LazyMotion>
  )
}
