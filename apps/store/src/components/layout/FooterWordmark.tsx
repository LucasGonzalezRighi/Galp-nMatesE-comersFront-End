'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { cx } from '../ui/cx'
import {
  clampCover,
  footerWordProgress,
  WORD_STRIP_DROP,
  wordStripClip,
  wordStripShare,
} from './footer-rise'
import { useFooterMotion } from './FooterRise'

/** Clase de la capa iluminada: encima de la fantasma, con su mismo tamaño. */
const LIT_LAYER = 'absolute inset-0 block'

/** Props de {@link FooterWordmark}. */
export interface FooterWordmarkProps {
  /** La palabra fantasma, la de siempre. */
  ghost: ReactNode
  /** La palabra iluminada, del mismo tamaño, que se dibuja encima. */
  lit: ReactNode
  /** Clases del marco (el margen y el apilado respecto de las columnas). */
  className?: string
}

/** Props de {@link WaveStrip}. */
interface WaveStripProps {
  /** La franja, desde 0 (la de la izquierda). */
  index: number
  /** Cuántas franjas tiene la palabra. */
  count: number
  /** Avance de la palabra, de 0 a 1. */
  progress: MotionValue<number>
  /** La palabra fantasma. */
  ghost: ReactNode
  /** La palabra iluminada. */
  lit: ReactNode
}

/**
 * Una franja vertical de la palabra: la palabra entera (fantasma e iluminada) recortada a su
 * tajada con `clip-path`, que sube desde abajo (`translateY` de {@link WORD_STRIP_DROP} % a 0),
 * aparece y se ilumina de abajo hacia arriba con su propio tramo del avance (`wordStripShare`).
 * Todas se apilan en el mismo lugar: la primera da el alto del marco y las demás van encima.
 */
function WaveStrip({ index, count, progress, ghost, lit }: WaveStripProps): ReactNode {
  const share = useTransform(progress, (value) => wordStripShare(value, index, count))
  const y = useTransform(share, (value) => `${String((1 - value) * WORD_STRIP_DROP)}%`)
  const clipPath = useTransform(share, (value) => `inset(${String((1 - value) * 100)}% 0 0 0)`)
  return (
    <m.span
      data-wordmark-strip={String(index)}
      className={cx('block', index === 0 ? 'relative' : 'absolute inset-0')}
      style={{ clipPath: wordStripClip(index, count), y, opacity: share }}
    >
      <span data-wordmark-layer="ghost" className="block">
        {ghost}
      </span>
      <m.span data-wordmark-layer="lit" className={LIT_LAYER} style={{ clipPath }}>
        {lit}
      </m.span>
    </m.span>
  )
}

/** Props de {@link WaveStrips}. */
interface WaveStripsProps {
  /** Cuántas franjas. */
  count: number
  /** Avance de la palabra, de 0 a 1. */
  progress: MotionValue<number>
  /** La palabra fantasma. */
  ghost: ReactNode
  /** La palabra iluminada. */
  lit: ReactNode
}

/** Las franjas de la palabra, de izquierda a derecha. */
function WaveStrips({ count, progress, ghost, lit }: WaveStripsProps): ReactNode {
  const indices = Array.from({ length: count }, (_, index) => index)
  return indices.map((index) => (
    <WaveStrip
      key={index}
      index={index}
      count={count}
      progress={progress}
      ghost={ghost}
      lit={lit}
    />
  ))
}

/** Props de las palabras que suben en ola. */
interface WaveWordmarkProps extends FooterWordmarkProps {
  /** Cuántas franjas. */
  count: number
}

/** La palabra en ola, pegada al scroll de su propio marco mientras entra en pantalla. */
function ScrollWordmark({ ghost, lit, className, count }: WaveWordmarkProps): ReactNode {
  const frame = useRef<HTMLDivElement | null>(null)
  // 0 cuando el marco asoma abajo de la ventana; 1 cuando su borde de abajo llega al de la ventana.
  const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end end'] })
  const progress = useTransform(scrollYProgress, clampCover)
  return (
    <div ref={frame} aria-hidden="true" data-wordmark="" className={cx('relative', className)}>
      <WaveStrips count={count} progress={progress} ghost={ghost} lit={lit} />
    </div>
  )
}

/** Props de {@link RisingWordmark}. */
interface RisingWordmarkProps extends WaveWordmarkProps {
  /** Cuánto subió el pie. */
  cover: MotionValue<number>
}

/** La palabra en ola que llega última, pegada a la subida del pie sobre las reseñas quietas. */
function RisingWordmark({ ghost, lit, className, count, cover }: RisingWordmarkProps): ReactNode {
  const progress = useTransform(cover, (value) => footerWordProgress(clampCover(value)))
  return (
    <div aria-hidden="true" data-wordmark="" className={cx('relative', className)}>
      <WaveStrips count={count} progress={progress} ghost={ghost} lit={lit} />
    </div>
  )
}

/**
 * La palabra GALPÓN gigante del pie, iluminada de abajo hacia arriba, que sube en ola con el
 * scroll (Lucas: "sube solo con un estilo ondulado y suave con el scrolling"). Se dibuja como 20
 * franjas verticales (12 en el celular, por debajo de 1024 px) que repiten la misma palabra, cada
 * una recortada a su tajada; cada franja sube desde abajo, aparece y se ilumina con su propio tramo
 * del avance, desfasado según su lugar y con la curva senoidal, así el borde de arriba de la palabra
 * es una ola que la recorre de izquierda a derecha y al final queda entera y quieta. De dónde sale
 * el avance depende del modo del pie (`FooterRise`):
 *
 * - `rise` (el pie sube por encima de las reseñas quietas del inicio): llega última, de la mitad
 *   de la subida al final (`footerWordProgress`).
 * - `scroll` (las demás páginas y el celular): mientras el marco de la palabra entra en pantalla
 *   (`useScroll` sobre él mismo, de `start end` a `end end`).
 * - `still` (menos movimiento): la palabra entera, iluminada y quieta, sin franjas.
 *
 * Es decorativa (`aria-hidden`) y no tiene nombre accesible. Sin JavaScript las franjas esperan
 * abajo y transparentes.
 *
 * @param props - Ver {@link FooterWordmarkProps}.
 */
export function FooterWordmark(props: FooterWordmarkProps): ReactNode {
  const { mode, cover, strips } = useFooterMotion()
  if (mode === 'rise' && cover !== null) {
    return <RisingWordmark {...props} count={strips} cover={cover} />
  }
  if (mode === 'scroll') {
    return <ScrollWordmark {...props} count={strips} />
  }
  return (
    <div aria-hidden="true" data-wordmark="" className={cx('relative', props.className)}>
      <span data-wordmark-layer="ghost" className="block">
        {props.ghost}
      </span>
      <span data-wordmark-layer="lit" className={LIT_LAYER}>
        {props.lit}
      </span>
    </div>
  )
}
