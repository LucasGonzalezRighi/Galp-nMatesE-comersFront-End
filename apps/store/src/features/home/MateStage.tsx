'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { m, useMotionValueEvent, useTransform } from 'motion/react'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'
import type { StoryData } from './SceneBody'
import type { MateStop } from './story-stops'
import { ScrollStage, useHeaderHideZone, useScrollStage } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { HeroIntro } from './HeroIntro'
import { HOME_COPY } from './home.copy'
import { MATE_STOP_COUNT } from './mate3d/keyframes'
import { MateCanvas } from './mate3d/MateCanvas'
import { SceneBody } from './SceneBody'
import { stageLayout } from './stage-layout'
import {
  backdropFramingStyle,
  backdropOpacity,
  MATE_PHOTO,
  MATE_PHOTO_FRAMING,
  MATE_STOPS,
  storyScenes,
} from './story-stops'
import { StoryRail } from './StoryRail'
import { StoryStop } from './StoryStop'

/** Avance a partir del cual se da por empezado el recorrido y se esconde la pista "Deslizá para recorrer". */
const HINT_LIMIT = 0.01

/**
 * Parte final del tramo de la última parada en que el escenario se funde a negro antes de la
 * colección (el mate ya se está yendo: la salida ocupa el 45 % final de ese tramo).
 */
const FADE_SHARE = 0.25

/** Desde qué avance empieza el fundido a negro. */
const FADE_FROM = 1 - FADE_SHARE / MATE_STOP_COUNT

/**
 * El texto va siempre sobre los fondos oscurecidos y el velo del lado del texto: el contenido de
 * cada parada usa los colores de las escenas oscuras.
 */
const STAGE_TONE = 'dark'

/** Props de {@link StageBackdrop}. */
interface StageBackdropProps {
  /** La parada. */
  stop: MateStop
  /** Posición de la parada, desde 0. */
  index: number
  /** `true` si es la parada actual. */
  current: boolean
  /** Avance del scroll de la sección. */
  progress: MotionValue<number>
}

/**
 * El fondo de una parada: su foto a pantalla completa, nítida y apenas oscurecida por CSS
 * (`.home-backdrop` en `home.css`), con el encuadre de su parada (`framing`, fijo: el mate 3D no
 * tapa lo importante de la foto). Se ve entero durante su parada y aparece encima del anterior con
 * la curva del recorrido ({@link backdropOpacity}). Solo el primero carga con prioridad.
 */
function StageBackdrop({ stop, index, current, progress }: StageBackdropProps): ReactNode {
  const opacity = useTransform(progress, (value) => backdropOpacity(value, MATE_STOP_COUNT, index))
  return (
    <m.div
      data-backdrop={stop.key}
      data-current={current ? 'true' : undefined}
      className="absolute inset-0 will-change-transform"
      style={{ opacity }}
    >
      <Image
        src={stop.backdrop}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        priority={index === 0}
        className="home-backdrop object-cover"
        style={backdropFramingStyle(stop.framing)}
      />
    </m.div>
  )
}

/** Props de {@link StageLayers}. */
interface StageLayersProps {
  /** Los datos de la historia y de la portada. */
  data: StoryData
}

/**
 * Las capas del escenario, de atrás hacia adelante: los fondos, la foto de respaldo (sin WebGL),
 * el velo, el mate 3D, el fundido a negro, los paneles de texto apilados, el raíl y la pista.
 */
function StageLayers({ data }: StageLayersProps): ReactNode {
  const { progress, scrollToStop } = useScrollStage()
  const [current, setCurrent] = useState(() => stageLayout(progress.get(), MATE_STOP_COUNT).index)
  const [started, setStarted] = useState(() => progress.get() > HINT_LIMIT)
  const [unavailable, setUnavailable] = useState(false)
  useMotionValueEvent(progress, 'change', (value) => {
    setCurrent(stageLayout(value, MATE_STOP_COUNT).index)
    setStarted(value > HINT_LIMIT)
  })
  const fade = useTransform(progress, [FADE_FROM, 1], [0, 1])
  // El texto de la última parada se apaga en el mismo tramo: el mate pasa por el medio sin pisarlo.
  const panelsOpacity = useTransform(progress, [FADE_FROM, 1], [1, 0])
  const onUnavailable = useCallback(() => {
    setUnavailable(true)
  }, [])
  const scenes = storyScenes(data.content.scenes)
  // Mientras el escenario se ve, el encabezado puede esconderse al bajar; desde la colección queda
  // fijo (Ruling MR-20). La capa de fondos ocupa el escenario entero.
  const zoneRef = useRef<HTMLDivElement>(null)
  useHeaderHideZone(zoneRef)

  const content = (stop: MateStop): ReactNode => {
    if (stop.key === 'hero') {
      return <HeroIntro hero={data.content.hero} kitDiscountLabel={data.kitDiscountLabel} entered />
    }
    const scene = scenes.find((candidate) => candidate.key === stop.key)
    return scene === undefined ? null : <SceneBody scene={scene} tone={STAGE_TONE} data={data} />
  }

  return (
    <>
      <div
        ref={zoneRef}
        aria-hidden="true"
        className="bg-background absolute inset-0 overflow-hidden"
      >
        {MATE_STOPS.map((stop, index) => (
          <StageBackdrop
            key={stop.key}
            stop={stop}
            index={index}
            current={index === current}
            progress={progress}
          />
        ))}
        {unavailable ? (
          <div data-mate-fallback="" className="absolute inset-0">
            <Image
              src={MATE_PHOTO}
              alt=""
              fill
              sizes="100vw"
              className="home-hero-poster object-cover"
              style={MATE_PHOTO_FRAMING}
            />
          </div>
        ) : null}
        {/*
         * El velo: por delante de las fotos y detrás del mate y del texto; también bajo el header y
         * abajo. Con los fondos nítidos se reforzó del lado del texto (90 % → 80 % hasta el 60 % de
         * su ancho): la frase y la bajada pasan sobre la bombilla y la pava de las fotos.
         */}
        <div className="from-background/90 via-background/80 absolute inset-y-0 left-0 w-3/5 bg-linear-to-r via-60% to-transparent" />
        <div className="from-background/70 absolute inset-x-0 top-0 h-40 bg-linear-to-b to-transparent" />
        <div className="from-background/70 absolute inset-x-0 bottom-0 h-40 bg-linear-to-t to-transparent" />
      </div>
      {unavailable ? null : <MateCanvas progress={progress} onUnavailable={onUnavailable} />}
      <m.div
        aria-hidden="true"
        data-stage-fade=""
        className="bg-background pointer-events-none absolute inset-0"
        style={{ opacity: fade }}
      />
      <m.div data-stage-panels="" className="relative h-full" style={{ opacity: panelsOpacity }}>
        {MATE_STOPS.map((stop, index) => (
          <StoryStop
            key={stop.key}
            index={index}
            total={MATE_STOP_COUNT}
            name={stop.name}
            current={index === current}
          >
            {content(stop)}
          </StoryStop>
        ))}
      </m.div>
      <StoryRail stops={MATE_STOPS} current={current} onSelect={scrollToStop} />
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

/** Props de {@link MateStage}. */
export interface MateStageProps {
  /** Los datos de la historia y de la portada. */
  data: StoryData
}

/**
 * El inicio en escritorio (spec 9.5): un escenario fijo a la altura de la ventana donde el scroll
 * recorre tres paradas mientras el Mate Imperial Premium en 3D (`MateCanvas`) se arma. 1 · "El
 * mate": el texto de la portada (`HeroIntro`, con el único `h1`) y el mate vacío a la derecha; en
 * su hold el mate se inclina, el paquete de yerba vuelca y la yerba se junta contra la pared baja.
 * 2 · "La bombilla": el mate de pie muestra la montañita con su pared y la bombilla se calza en el
 * hueco (escena `bombilla` de `HomeContent.scenes`). 3 · "El agua": el termo sirve un chorro fino en
 * el hueco, la yerba se humedece y sube el vapor (escena `ritual`). El estado del mate sale del
 * mismo avance del `ScrollStage` (`mateStateAt`, adentro de `MateCanvas`): las tres paradas y la
 * salida están repartidas en él.
 *
 * Detrás, la foto de cada parada nítida (`pieces`, `bombilla`, `ritual`) con fundido cruzado;
 * delante, el velo del color de fondo a la izquierda y los paneles de texto apilados, donde solo se
 * ve el de la parada actual (`StoryStop`); el raíl marca la actual y lleva a cualquiera; la pista
 * se esconde al empezar. Al final de la tercera parada el mate sube al medio y se va, su texto se
 * apaga y el escenario se funde a negro antes de la colección (los dos en el mismo tramo final). Sin
 * WebGL, en lugar del lienzo va la foto del mate. Solo se animan `transform`, `opacity` y el lienzo.
 *
 * Lo monta `HomeStory` después de hidratar, desde 1024 × 700 y sin `prefers-reduced-motion`.
 *
 * @param props - Ver {@link MateStageProps}.
 */
export function MateStage({ data }: MateStageProps): ReactNode {
  return (
    <ScrollStage stops={MATE_STOP_COUNT} label={HOME_COPY.stageLabel} className="bg-background">
      <StageLayers data={data} />
    </ScrollStage>
  )
}
