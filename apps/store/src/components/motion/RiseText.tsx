'use client'

import type { ReactNode } from 'react'
import { tokens } from '@galpon/design-tokens'
import { Reveal } from './Reveal'
import { assertNonNegative } from './validate'

/** Retardo entre una línea y la siguiente, en milisegundos (los 60 y 180 del diseño, por 120). */
const DEFAULT_STAGGER_MS = 120

/** Props de {@link RiseText}. */
export interface RiseTextProps {
  /** Las líneas del texto, cada una en su propia máscara. Tiene que haber al menos una. */
  lines: readonly string[]
  /** Etiqueta contenedora. Por omisión `p`; para títulos, `h1`, `h2` o `h3`. */
  as?: 'div' | 'h1' | 'h2' | 'h3' | 'p'
  /** Retardo de la primera línea, en milisegundos. Por omisión 0. */
  delay?: number
  /** Retardo entre líneas, en milisegundos. Por omisión 120. */
  stagger?: number
  /** Duración de cada línea, en milisegundos. Por omisión `tokens.durations.reveal` (1000). */
  duration?: number
  /** Clase del contenedor. */
  className?: string
  /** Clase del texto de cada línea (por ejemplo, un degradado con `background-clip: text`). */
  lineClassName?: string
}

/**
 * Título cuyas líneas suben una tras otra desde una máscara al entrar en pantalla.
 * Es {@link Reveal} con la forma `rise` aplicado a cada línea, con el retardo escalonado.
 *
 * @param props - Ver {@link RiseTextProps}.
 * @throws {RangeError} Si no hay líneas o si `delay`, `stagger` o `duration` son negativos.
 * @example
 * <RiseText as="h1" lines={['Encontrá', 'tu mate']} />
 */
export function RiseText({
  lines,
  as = 'p',
  delay = 0,
  stagger = DEFAULT_STAGGER_MS,
  duration = tokens.durations.reveal,
  className,
  lineClassName,
}: RiseTextProps): ReactNode {
  if (lines.length === 0) {
    throw new RangeError('RiseText necesita al menos una línea.')
  }
  assertNonNegative('delay', delay)
  assertNonNegative('stagger', stagger)
  assertNonNegative('duration', duration)
  const Tag = as
  return (
    <Tag className={className}>
      {lines.map((line, index) => (
        <Reveal
          key={`${String(index)}-${line}`}
          kind="rise"
          as="span"
          delay={delay + index * stagger}
          duration={duration}
          contentClassName={lineClassName}
        >
          {line}
        </Reveal>
      ))}
    </Tag>
  )
}
