'use client'

import type { MotionValue } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { Fragment, useRef } from 'react'
import { MotionFeatures } from './MotionFeatures'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertIntegerInRange } from './validate'

/** Opacidad de una palabra que todavía no se "iluminó". */
const DIM_OPACITY = 0.14

/** Cuántas palabras se están iluminando a la vez (la "ola" del efecto). */
const WAVE_WORDS = 4

/**
 * Opacidad de una palabra según el avance del scroll: las palabras se iluminan de a una, en
 * orden, con una ola de {@link WAVE_WORDS} palabras. Antes de su turno vale 0,14 y después, 1.
 *
 * @param progress - Avance del scroll por el texto, de 0 a 1 (se recorta a ese rango).
 * @param index - Posición de la palabra, desde 0.
 * @param count - Cantidad total de palabras (al menos 1).
 * @returns La opacidad, de 0,14 a 1.
 * @throws {RangeError} Si `count` no es un entero mayor o igual a 1 o `index` no es un entero
 *   entre 0 y `count - 1`.
 * @example
 * wordOpacity(0, 0, 10) // 0.14
 */
export function wordOpacity(progress: number, index: number, count: number): number {
  assertIntegerInRange('count', count, 1, Number.MAX_SAFE_INTEGER)
  assertIntegerInRange('index', index, 0, count - 1)
  const clamped = Math.min(1, Math.max(0, progress))
  const lit = Math.min(1, Math.max(0, (clamped * (count + WAVE_WORDS) - index) / WAVE_WORDS))
  return DIM_OPACITY + (1 - DIM_OPACITY) * lit
}

/** Props de {@link ScrubWord}. */
interface ScrubWordProps {
  /** La palabra. */
  word: string
  /** Su posición en el texto. */
  index: number
  /** Cantidad total de palabras. */
  count: number
  /** Avance del scroll por el texto, de 0 a 1. */
  progress: MotionValue<number>
}

/** Una palabra cuya opacidad sigue el avance del scroll. */
function ScrubWord({ word, index, count, progress }: ScrubWordProps): ReactNode {
  const opacity = useTransform(progress, (value) => wordOpacity(value, index, count))
  return <m.span style={{ opacity }}>{word}</m.span>
}

/** Props de {@link ScrubText}. */
export interface ScrubTextProps {
  /** El texto. Las palabras se separan por espacios. No puede estar vacío. */
  text: string
  /** Etiqueta del contenedor. Por omisión `p`. */
  as?: 'div' | 'h2' | 'h3' | 'p'
  /** Clase del contenedor. */
  className?: string
  /** Estilo del contenedor. */
  style?: CSSProperties
}

/** El texto con las palabras que se iluminan con el scroll. */
function ScrubWords({ text, as = 'p', className, style }: ScrubTextProps): ReactNode {
  const words = splitWords(text)
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 50%'] })
  const Tag = as
  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node
      }}
      className={className}
      style={style}
    >
      {words.map((word, index) => (
        <Fragment key={`${String(index)}-${word}`}>
          {index > 0 ? ' ' : null}
          <ScrubWord word={word} index={index} count={words.length} progress={scrollYProgress} />
        </Fragment>
      ))}
    </Tag>
  )
}

/** Separa un texto en palabras; exige al menos una. */
function splitWords(text: string): string[] {
  const words = text.split(/\s+/).filter((word) => word !== '')
  if (words.length === 0) {
    throw new RangeError('ScrubText necesita un texto con al menos una palabra.')
  }
  return words
}

/**
 * Texto que se ilumina palabra por palabra mientras se hace scroll: empieza atenuado cuando su
 * borde superior llega al 85 % de la altura de la ventana y termina completo cuando su borde
 * inferior pasa de la mitad.
 *
 * Con `prefers-reduced-motion: reduce` se muestra completo, sin atenuar.
 *
 * @param props - Ver {@link ScrubTextProps}.
 * @throws {RangeError} Si `text` no tiene ninguna palabra.
 * @example
 * <ScrubText text="Cada mate se arma a mano, uno por uno." />
 */
export function ScrubText(props: ScrubTextProps): ReactNode {
  const words = splitWords(props.text)
  const reduced = usePrefersReducedMotion()
  if (reduced) {
    const Tag = props.as ?? 'p'
    return (
      <Tag className={props.className} style={props.style}>
        {words.join(' ')}
      </Tag>
    )
  }
  return (
    <MotionFeatures>
      <ScrubWords {...props} />
    </MotionFeatures>
  )
}
