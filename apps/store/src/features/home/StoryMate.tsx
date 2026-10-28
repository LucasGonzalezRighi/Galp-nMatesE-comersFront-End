'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { m, useTransform } from 'motion/react'
import type { ProductSummary } from '@galpon/api-client'
import type { StoryStopData } from './story-stops'
import { EASE_MAIN, Float } from '../../components/motion'
import { ImageWithPlaceholder } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { stopCounter } from './home.copy'

/** Props de {@link StoryMate}. */
export interface StoryMateProps {
  /** Las paradas del paseo, cada una con su pieza. */
  stops: readonly StoryStopData[]
  /** Posición de la parada actual, desde 0. */
  current: number
  /** Avance de todo el paseo, de 0 a 1: mueve el mate despacio, como una cámara. */
  progress: MotionValue<number>
}

/** `true` si la pieza existe y tiene foto. */
function hasPhoto(piece: ProductSummary | null): piece is ProductSummary {
  return piece !== null && piece.mainImage !== null
}

/** Las piezas distintas de las paradas que tienen foto, en el orden en que aparecen. */
function piecesWithPhoto(stops: readonly StoryStopData[]): ProductSummary[] {
  const pieces = new Map<string, ProductSummary>()
  for (const { visual } of stops) {
    if (hasPhoto(visual) && !pieces.has(visual.id)) pieces.set(visual.id, visual)
  }
  return [...pieces.values()]
}

/**
 * La capa del mate del paseo: fija a la derecha del escenario, centrada en el alto, con la foto de
 * la pieza de la parada actual. Al cambiar de parada las fotos se funden (una por pieza distinta,
 * superpuestas) y la pieza cambia de tamaño (la calabaza se ve más grande); si la pieza de una
 * parada no tiene foto, sigue la última que tenía. Flota como en las
 * escenas y se corre despacio de 3vw a −3vw a lo largo de todo el paseo, más lento que la pista.
 * Debajo, la leyenda con el nombre de la pieza y "02 / 06" (el contador es decorativo).
 *
 * Desde 1280 px se corre 104 px más a la izquierda para dejarle lugar al raíl con el nombre de la
 * parada actual; la separación con la leyenda alcanza para la calabaza agrandada.
 *
 * Es el lugar donde entra el mate 3D en P5: no sabe nada de la pista ni del raíl.
 *
 * @param props - Ver {@link StoryMateProps}.
 */
export function StoryMate({ stops, current, progress }: StoryMateProps): ReactNode {
  const drift = useTransform(progress, [0, 1], ['3vw', '-3vw'])
  const pieces = piecesWithPhoto(stops)
  const stop = stops[current]
  if (stop === undefined || pieces.length === 0) return null
  // Si la pieza de la parada no tiene foto, sigue la última que tenía (siempre hay un mate a la vista).
  const shown =
    stops
      .slice(0, current + 1)
      .map((candidate) => candidate.visual)
      .findLast(hasPhoto) ??
    pieces[0] ??
    null
  return (
    <div className="pointer-events-none absolute inset-y-0 right-[clamp(20px,7vw,120px)] flex items-center pt-16 xl:right-[calc(clamp(20px,7vw,120px)+104px)]">
      <m.figure
        className="m-0 flex w-[min(30vw,420px)] flex-col items-center gap-[calc(16px+min(30vw,420px)*0.075)] will-change-transform"
        style={{ x: drift }}
      >
        <m.div
          className="w-full"
          initial={false}
          animate={{ scale: stop.visualScale }}
          transition={{ duration: 0.8, ease: EASE_MAIN }}
        >
          <Float>
            <div aria-hidden="true" className="relative aspect-[4/5] w-full">
              {pieces.map((piece, position) => (
                <div
                  key={piece.id}
                  data-piece={piece.slug}
                  data-current={piece.id === shown?.id ? 'true' : undefined}
                  className={cx(
                    'ease-main absolute inset-0 transition-opacity duration-[600ms]',
                    piece.id === shown?.id ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  <ImageWithPlaceholder
                    src={piece.mainImage?.url}
                    alt=""
                    priority={position === 0}
                    sizes="(min-width: 1024px) 30vw, 62vw"
                    className="aspect-[4/5] w-full rounded-[14px] shadow-lg"
                  />
                </div>
              ))}
            </div>
          </Float>
        </m.div>
        <figcaption
          className={cx(
            'flex items-center gap-3 text-[12px]',
            stop.tone === 'light' ? 'text-background/70' : 'text-neutral-400',
          )}
        >
          {shown === null ? null : <span>{shown.name}</span>}
          <span aria-hidden="true" className="tabular-nums">
            {stopCounter(current + 1, stops.length)}
          </span>
        </figcaption>
      </m.figure>
    </div>
  )
}
