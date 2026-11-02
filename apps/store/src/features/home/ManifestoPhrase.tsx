'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { createContext, Fragment, useContext } from 'react'
import { ScrubText, usePrefersReducedMotion, wordOpacity } from '../../components/motion'
import { MotionFeatures } from '../../components/motion/MotionFeatures'

/**
 * El recorrido de la pantalla clavada del Manifiesto (`PinnedManifesto`): el contenedor que sí se
 * mueve con el scroll. Fuera de la pantalla clavada es `null`.
 */
export const ManifestoPinContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

/** Props de {@link ManifestoPhrase}. */
export interface ManifestoPhraseProps {
  /** La frase. Las palabras se separan por espacios. No puede estar vacía. */
  text: string
  /** Clase del párrafo. */
  className?: string
}

/** Props de {@link PinnedWord}. */
interface PinnedWordProps {
  /** La palabra. */
  word: string
  /** Su posición en la frase. */
  index: number
  /** Cantidad total de palabras. */
  count: number
  /** Avance de la ola, de 0 a 1. */
  progress: MotionValue<number>
}

/** Una palabra cuya opacidad sigue el avance (`wordOpacity`, la misma ola que `ScrubText`). */
function PinnedWord({ word, index, count, progress }: PinnedWordProps): ReactNode {
  const opacity = useTransform(progress, (value) => wordOpacity(value, index, count))
  return <m.span style={{ opacity }}>{word}</m.span>
}

/** Props de {@link PinnedWords}. */
interface PinnedWordsProps {
  /** Las palabras de la frase. */
  words: string[]
  /** Clase del párrafo. */
  className?: string
  /** El recorrido de la pantalla clavada. */
  track: RefObject<HTMLDivElement | null>
}

/** La frase que se ilumina mientras la pantalla clavada sube hasta clavarse. */
function PinnedWords({ words, className, track }: PinnedWordsProps): ReactNode {
  // 0 cuando la pantalla asoma al 85 % de la ventana; 1 cuando su borde llega al 10 % de arriba,
  // justo antes de clavarse: clavada, la frase está entera.
  const { scrollYProgress } = useScroll({ target: track, offset: ['start 85%', 'start 10%'] })
  return (
    <p className={className}>
      {words.map((word, index) => (
        <Fragment key={`${String(index)}-${word}`}>
          {index > 0 ? ' ' : null}
          <PinnedWord word={word} index={index} count={words.length} progress={scrollYProgress} />
        </Fragment>
      ))}
    </p>
  )
}

/**
 * La frase del Manifiesto, que se ilumina palabra por palabra con el scroll (spec 9.5). Suelta, es
 * `ScrubText`; en la pantalla clavada (`PinnedManifesto`, que da su recorrido por
 * {@link ManifestoPinContext}) la ola se mide sobre ese recorrido y termina justo antes de clavarse:
 * `ScrubText` mide la frase misma, que clavada no se mueve, y la dejaba a medio iluminar.
 *
 * Con `prefers-reduced-motion: reduce` se muestra completa, sin atenuar.
 *
 * @param props - Ver {@link ManifestoPhraseProps}.
 * @throws {RangeError} Si `text` no tiene ninguna palabra.
 */
export function ManifestoPhrase({ text, className }: ManifestoPhraseProps): ReactNode {
  const track = useContext(ManifestoPinContext)
  const reduced = usePrefersReducedMotion()
  const words = text.split(/\s+/).filter((word) => word !== '')
  if (words.length === 0) {
    throw new RangeError('La frase del Manifiesto necesita al menos una palabra.')
  }
  if (track === null || reduced) return <ScrubText text={text} className={className} />
  return (
    <MotionFeatures>
      <PinnedWords words={words} className={className} track={track} />
    </MotionFeatures>
  )
}
