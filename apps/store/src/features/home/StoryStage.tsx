'use client'

import type { ReactNode } from 'react'
import { m, useMotionValueEvent, useTransform } from 'motion/react'
import { useMemo, useState } from 'react'
import type { StoryData } from './SceneBody'
import type { StoryStopData } from './story-stops'
import { ScrollStage, useScrollStage } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { HOME_COPY } from './home.copy'
import { SceneBody } from './SceneBody'
import { stageLayout } from './stage-layout'
import { storyStops } from './story-stops'
import { StoryMate } from './StoryMate'
import { StoryRail } from './StoryRail'
import { SCENE_BACKGROUND_CLASSES } from './StoryScene'
import { StoryStop } from './StoryStop'

/** Avance a partir del cual se da por empezado el paseo y se esconde la pista "Deslizá para recorrer". */
const HINT_LIMIT = 0.01

/** Props de {@link StageLayers}. */
interface StageLayersProps {
  /** Las paradas, en orden. */
  stops: readonly StoryStopData[]
  /** Los datos de la historia. */
  data: StoryData
}

/** Las capas del escenario: fondos, mate, pista de paradas, raíl y pista de scroll. */
function StageLayers({ stops, data }: StageLayersProps): ReactNode {
  const { progress, scrollToStop } = useScrollStage()
  const count = stops.length
  const [current, setCurrent] = useState(() => stageLayout(progress.get(), count).index)
  const [started, setStarted] = useState(() => progress.get() > HINT_LIMIT)
  useMotionValueEvent(progress, 'change', (value) => {
    setCurrent(stageLayout(value, count).index)
    setStarted(value > HINT_LIMIT)
  })
  const trackX = useTransform(
    progress,
    (value) => `${String(stageLayout(value, count).trackX * 100)}vw`,
  )
  const leatherIndex = stops.findIndex((stop) => stop.key === 'leather')
  // El cuero destacado sigue el avance de su parada quieta: antes de llegar, el primero; después, el último.
  const leatherProgress = useTransform(progress, (value) => {
    const layout = stageLayout(value, count)
    if (layout.index === leatherIndex) return layout.holdProgress
    return layout.index > leatherIndex ? 1 : 0
  })
  const tone = stops[current]?.tone ?? 'dark'

  return (
    <>
      <div aria-hidden="true" className="absolute inset-0">
        {stops.map((stop, index) => (
          <div
            key={stop.key}
            data-stop-background={stop.key}
            className={cx(
              'ease-main absolute inset-0 transition-opacity duration-[600ms]',
              stop.tone === 'light' ? 'home-bg-light' : 'bg-background',
              index === current ? 'opacity-100' : 'opacity-0',
            )}
          >
            {stop.background === null ? null : (
              <div className={cx('absolute inset-0', SCENE_BACKGROUND_CLASSES[stop.background])} />
            )}
            {stop.key === 'bombilla' ? (
              <span className="home-ghost">{HOME_COPY.ghostWord}</span>
            ) : null}
          </div>
        ))}
      </div>
      <StoryMate stops={stops} current={current} progress={progress} />
      <m.div className="relative flex h-full will-change-transform" style={{ x: trackX }}>
        {stops.map((stop, index) => (
          <StoryStop key={stop.key} index={index} total={count} name={stop.name} tone={stop.tone}>
            <SceneBody
              scene={stop.scene}
              tone={stop.tone}
              data={data}
              leatherProgress={leatherProgress}
            />
          </StoryStop>
        ))}
      </m.div>
      <StoryRail stops={stops} current={current} tone={tone} onSelect={scrollToStop} />
      <p
        aria-hidden="true"
        className={cx(
          'ease-main pointer-events-none absolute right-[clamp(20px,2.4vw,40px)] bottom-8 z-10 m-0 flex items-center gap-3 text-[12px] tracking-[0.16em] uppercase transition-opacity duration-500',
          tone === 'light' ? 'text-background/70' : 'text-neutral-400',
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
 * El paseo del mate (spec 9.5): la historia del inicio como un escenario fijo a la altura de la
 * ventana donde el scroll mueve las paradas de costado. Cada parada se queda quieta
 * el 55 % de su tramo para leer y desliza a la siguiente en el resto (`stageLayout`). El mate
 * queda a la derecha como referencia y cambia de pieza en cada parada (`StoryMate`); los fondos se
 * funden; el raíl de la derecha marca la parada actual y lleva a cualquiera (`StoryRail`); la pista
 * "Deslizá para recorrer" se esconde al empezar. Solo se animan `transform` y `opacity`.
 *
 * Lo monta `HomeStory` después de hidratar, desde 1024 px de ancho y 700 de alto y sin
 * `prefers-reduced-motion`.
 *
 * @param props - Ver {@link StoryStageProps}.
 */
export function StoryStage({ data }: StoryStageProps): ReactNode {
  const stops = useMemo(() => storyStops(data.content.scenes, data.story), [data])
  if (stops.length === 0) return null
  return (
    <ScrollStage stops={stops.length} label={HOME_COPY.stageLabel} className="bg-background">
      <StageLayers stops={stops} data={data} />
    </ScrollStage>
  )
}
