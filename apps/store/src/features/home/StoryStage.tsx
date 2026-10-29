'use client'

import type { ReactNode } from 'react'
import { useMotionValueEvent, useTransform } from 'motion/react'
import { useMemo, useState } from 'react'
import type { StoryData } from './SceneBody'
import type { WorldStopData } from './world-media'
import { ScrollStage, useScrollStage } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { HOME_COPY } from './home.copy'
import { SceneBody } from './SceneBody'
import { stageLayout } from './stage-layout'
import { StoryRail } from './StoryRail'
import { StoryStop } from './StoryStop'
import { StoryWorld } from './StoryWorld'
import { worldStops } from './world-media'

/** Avance a partir del cual se da por empezado el paseo y se esconde la pista "Deslizá para recorrer". */
const HINT_LIMIT = 0.01

/**
 * El texto va siempre sobre el mundo (fotos cálidas y oscuras) y el velo del color de fondo: claro,
 * como en las paradas oscuras, sin importar el tono de la escena en las apiladas.
 */
const STAGE_TONE = 'dark'

/** Props de {@link StageLayers}. */
interface StageLayersProps {
  /** Las paradas del mundo, en el orden del relato. */
  stops: readonly WorldStopData[]
  /** Los datos de la historia. */
  data: StoryData
}

/** Las capas del escenario: el mundo, el velo, los paneles apilados, el raíl y la pista de scroll. */
function StageLayers({ stops, data }: StageLayersProps): ReactNode {
  const { progress, scrollToStop } = useScrollStage()
  const count = stops.length
  const [current, setCurrent] = useState(() => stageLayout(progress.get(), count).index)
  const [started, setStarted] = useState(() => progress.get() > HINT_LIMIT)
  useMotionValueEvent(progress, 'change', (value) => {
    setCurrent(stageLayout(value, count).index)
    setStarted(value > HINT_LIMIT)
  })
  const leatherIndex = stops.findIndex((stop) => stop.key === 'leather')
  // El cuero destacado sigue el avance de su parada quieta: antes de llegar, el primero; después, el último.
  const leatherProgress = useTransform(progress, (value) => {
    const layout = stageLayout(value, count)
    if (layout.index === leatherIndex) return layout.holdProgress
    return layout.index > leatherIndex ? 1 : 0
  })

  return (
    <>
      <StoryWorld stops={stops} progress={progress} />
      {/* El velo: por delante del mundo y detrás del texto; también bajo el header y abajo. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="from-background/85 via-background/45 absolute inset-y-0 left-0 w-3/5 bg-linear-to-r to-transparent" />
        <div className="from-background/70 absolute inset-x-0 top-0 h-40 bg-linear-to-b to-transparent" />
        <div className="from-background/70 absolute inset-x-0 bottom-0 h-40 bg-linear-to-t to-transparent" />
      </div>
      <div className="relative h-full">
        {stops.map((stop, index) => (
          <StoryStop
            key={stop.key}
            index={index}
            total={count}
            name={stop.name}
            tone={STAGE_TONE}
            current={index === current}
          >
            <SceneBody
              scene={stop.scene}
              tone={STAGE_TONE}
              data={data}
              leatherProgress={leatherProgress}
            />
          </StoryStop>
        ))}
      </div>
      <StoryRail stops={stops} current={current} tone={STAGE_TONE} onSelect={scrollToStop} />
      <p
        aria-hidden="true"
        className={cx(
          'ease-main pointer-events-none absolute right-[clamp(20px,2.4vw,40px)] bottom-8 z-10 m-0 flex items-center gap-3 text-[12px] tracking-[0.16em] text-neutral-400 uppercase transition-opacity duration-500',
          started ? 'opacity-0' : 'opacity-100',
        )}
      >
        {HOME_COPY.scrollHint}
        <span className="home-hint-line" />
      </p>
    </>
  )
}

/** Props de {@link StoryStage}. */
export interface StoryStageProps {
  /** Los datos de la historia. */
  data: StoryData
}

/**
 * El paseo del mate (spec 9.5) como el mundo del mate: un escenario fijo a la altura de la ventana
 * donde el scroll recorre seis paradas en el orden del relato (`worldStops`: el yerbal, el galpón,
 * el mate, la bombilla, el ritual y la ronda). Detrás, el mundo a pantalla completa (`StoryWorld`):
 * el cuadro de cada parada con la cámara que avanza, o su clip frotado por el scroll cuando exista.
 * Delante, un velo del color de fondo y los paneles de texto apilados en la columna de la izquierda,
 * donde solo se ve el de la parada actual. Cada parada se queda quieta el 55 % de su tramo y
 * desliza a la siguiente en el resto (`stageLayout`); el raíl de la derecha marca la parada actual
 * y lleva a cualquiera (`StoryRail`); la pista "Deslizá para recorrer" se esconde al empezar. Solo
 * se animan `transform` y `opacity` (y el `currentTime` de los clips).
 *
 * Lo monta `HomeStory` después de hidratar, desde 1024 px de ancho y 700 de alto y sin
 * `prefers-reduced-motion`.
 *
 * @param props - Ver {@link StoryStageProps}.
 */
export function StoryStage({ data }: StoryStageProps): ReactNode {
  const stops = useMemo(() => worldStops(data.content.scenes, data.story), [data])
  if (stops.length === 0) return null
  return (
    <ScrollStage stops={stops.length} label={HOME_COPY.stageLabel} className="bg-background">
      <StageLayers stops={stops} data={data} />
    </ScrollStage>
  )
}
