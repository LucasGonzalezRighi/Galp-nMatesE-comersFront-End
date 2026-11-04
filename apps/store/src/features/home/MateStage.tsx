'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { m, useMotionValueEvent, useTransform } from 'motion/react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MateState } from './mate3d/keyframes'
import type { PassLook } from './mate3d/pass-look'
import type { StoryData } from './SceneBody'
import type { MateStop } from './story-stops'
import { ScrollStage, useHeaderHideZone, useScrollStage } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { HeroIntro } from './HeroIntro'
import { HOME_COPY } from './home.copy'
import { MATE_STOP_COUNT, PASS_FROM } from './mate3d/keyframes'
import { MateCanvas } from './mate3d/MateCanvas'
import { passLook } from './mate3d/pass-look'
import { registerMateStage } from './mate-stage-presence'
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
 * Avance en que ya se apagaron el texto de la parada 3 y el raíl: el primer 20 % del pase (Ruling
 * AT-1). Después el mate se levanta y se va por arriba sin pisar letras.
 */
const TEXT_OUT = PASS_FROM + (1 - PASS_FROM) * 0.2

/**
 * Avance en que ya se apagaron la foto de fondo de la última parada (la pava y el mate) y la foto
 * de respaldo sin WebGL: el primer tercio del pase. Así el mate 3D no sube encima del mate de la
 * foto y, al soltarse el escenario, queda el fondo liso de la página (sin costura con la colección).
 */
const BACKDROP_OUT = PASS_FROM + (1 - PASS_FROM) / 3

/**
 * Cuánto se ven las fotos de fondo en el pase: enteras hasta {@link PASS_FROM} y nada desde
 * {@link BACKDROP_OUT}, en línea recta (como el texto y el raíl).
 */
function passBackdropShare(value: number): number {
  return Math.min(1, Math.max(0, (BACKDROP_OUT - value) / (BACKDROP_OUT - PASS_FROM)))
}

/** Cómo arranca la capa del lienzo: nítida y entera, sin estilos (las paradas). */
const RESTING_LOOK: PassLook = { filter: 'none', opacity: 1 }

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
 * la curva del recorrido ({@link backdropOpacity}); en el primer tercio del pase se apaga
 * ({@link BACKDROP_OUT}). Solo el primero carga con prioridad.
 */
function StageBackdrop({ stop, index, current, progress }: StageBackdropProps): ReactNode {
  const opacity = useTransform(
    progress,
    (value) => backdropOpacity(value, MATE_STOP_COUNT, index) * passBackdropShare(value),
  )
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
 * el velo, el mate 3D, los paneles de texto apilados, el raíl y la pista.
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
  // El texto de la última parada y el raíl se apagan en el primer 20 % del pase: el mate sube sin
  // pisarlos y el raíl nunca queda encima de la colección.
  const panelsOpacity = useTransform(progress, [PASS_FROM, TEXT_OUT], [1, 0])
  const textGone = useTransform(progress, (value) => value >= TEXT_OUT)
  const panelsPointer = useTransform(textGone, (gone) => (gone ? 'none' : 'auto'))
  const railVisibility = useTransform(textGone, (gone) => (gone ? 'hidden' : 'visible'))
  const fallbackOpacity = useTransform(progress, passBackdropShare)
  const onUnavailable = useCallback(() => {
    setUnavailable(true)
  }, [])
  // El desenfoque y el apagado del pase salen de la altura del mate ya suavizado (la que se ve), no
  // del scroll: así no se adelantan al 3D. Se escriben directo en la capa y solo si cambian.
  const canvasLayerRef = useRef<HTMLDivElement>(null)
  const lookRef = useRef<PassLook>(RESTING_LOOK)
  const onFrame = useCallback((state: MateState) => {
    const layer = canvasLayerRef.current
    if (layer === null) return
    const look = passLook(state.mate[1])
    const last = lookRef.current
    if (look.filter !== last.filter) layer.style.filter = look.filter
    if (look.opacity !== last.opacity) layer.style.opacity = String(look.opacity)
    lookRef.current = look
  }, [])
  const scenes = storyScenes(data.content.scenes)
  // Mientras el escenario se ve, el encabezado puede esconderse al bajar; la colección lo fija apenas
  // se revela su título (Rulings MR-20 y AT-1). La capa de fondos ocupa el escenario entero.
  const zoneRef = useRef<HTMLDivElement>(null)
  useHeaderHideZone(zoneRef)
  // La colección que viene debajo se monta encima del final del escenario y entra en el pase.
  useEffect(() => registerMateStage(), [])

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
          <m.div
            data-mate-fallback=""
            className="absolute inset-0"
            style={{ opacity: fallbackOpacity }}
          >
            <Image
              src={MATE_PHOTO}
              alt=""
              fill
              sizes="100vw"
              className="home-hero-poster object-cover"
              style={MATE_PHOTO_FRAMING}
            />
          </m.div>
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
      {/*
       * En el pase la capa se desenfoca y se apaga (`passLook`, desde `onFrame`); nunca el `canvas`,
       * que tiene su propio fundido de entrada. Fuera de cuadro three descarta el mate y, cuando el
       * escenario se va de la pantalla, `MateCanvas` pausa la escena.
       */}
      <div ref={canvasLayerRef} data-stage-canvas="" className="absolute inset-0">
        {unavailable ? null : (
          <MateCanvas progress={progress} onUnavailable={onUnavailable} onFrame={onFrame} />
        )}
      </div>
      <m.div
        data-stage-panels=""
        className="relative h-full"
        style={{ opacity: panelsOpacity, pointerEvents: panelsPointer }}
      >
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
      <m.div data-stage-rail="" style={{ opacity: panelsOpacity, visibility: railVisibility }}>
        <StoryRail stops={MATE_STOPS} current={current} onSelect={scrollToStop} />
      </m.div>
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
 * mismo avance del `ScrollStage` (`mateStateAt`, adentro de `MateCanvas`): las tres paradas y el
 * pase están repartidos en él.
 *
 * Detrás, la foto de cada parada nítida (`pieces`, `bombilla`, `ritual`) con fundido cruzado;
 * delante, el velo del color de fondo a la izquierda y los paneles de texto apilados, donde solo se
 * ve el de la parada actual (`StoryStop`); el raíl marca la actual y lleva a cualquiera; la pista
 * se esconde al empezar. Al final de la tercera parada viene el pase (Ruling AT-1): en su primer
 * 20 % se apagan el texto y el raíl, y en su primer tercio la foto de fondo; el mate se levanta,
 * avanza hacia quien mira con la bombilla ofrecida y se va por arriba, y la capa del lienzo se
 * desenfoca (hasta `PASS_BLUR_PX`) y se apaga con la altura del mate ya suavizado (`passLook`, desde
 * el `onFrame` de la escena). El escenario termina en el fondo liso de la página, sin costura: la
 * colección se monta encima de su final y entra en el mismo gesto (`CollectionEntrance`, que sabe
 * del escenario por `registerMateStage`). Sin WebGL, en lugar del lienzo va la foto del mate, que se
 * apaga con las de fondo. Solo se animan `transform`, `opacity` y el `filter` de la capa del lienzo.
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
