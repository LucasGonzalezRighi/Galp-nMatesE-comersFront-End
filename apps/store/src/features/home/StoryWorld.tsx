'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useMotionValueEvent, useTransform } from 'motion/react'
import Image from 'next/image'
import { useCallback, useRef, useState, useSyncExternalStore } from 'react'
import type { WorldStopData } from './world-media'
import { usePrefersReducedMotion } from '../../components/motion'
import { stageLayout } from './stage-layout'
import { worldLayer } from './world-media'

/** Cuánto se acerca la cámara sobre el cuadro fijo a lo largo del tramo (de 1 a 1,06). */
const CAMERA_ZOOM = 1.06

/** Deriva de la cámara sobre el cuadro fijo a lo largo del tramo, de un extremo al otro. */
const CAMERA_DRIFT = ['-1.5vw', '1.5vw']

/** `HTMLMediaElement.HAVE_CURRENT_DATA`: desde ahí el video puede pintar el cuadro buscado. */
const HAVE_CURRENT_DATA = 2

/** La conexión del navegador, donde existe (`navigator.connection` no está en todos). */
interface NetworkInformationLike {
  /** `true` si el usuario pidió ahorrar datos. */
  saveData?: boolean
}

/** Sin suscripción: el ahorro de datos se lee una vez por render. */
function subscribeNever(): () => void {
  return () => undefined
}

/** `true` si el navegador pide ahorrar datos (`navigator.connection.saveData`). */
function readSaveData(): boolean {
  const { connection } = navigator as Navigator & { connection?: NetworkInformationLike }
  return connection?.saveData === true
}

/** En el servidor se supone ahorro de datos: el HTML nunca trae video. */
function serverSaveData(): boolean {
  return true
}

/** `true` si el navegador pide ahorrar datos; en el servidor, siempre. */
function useSaveData(): boolean {
  return useSyncExternalStore(subscribeNever, readSaveData, serverSaveData)
}

/** Props de {@link WorldClip}. */
interface WorldClipProps {
  /** Ruta del clip. */
  clip: string
  /** Ruta del poster, que el video muestra hasta tener cuadros. */
  poster: string
  /** `true` en la parada actual y sus vecinas: solo esas cargan el clip. */
  near: boolean
  /** Avance del scroll de la sección. */
  progress: MotionValue<number>
  /** Cantidad de paradas. */
  count: number
  /** Posición de la parada, desde 0. */
  index: number
}

/**
 * El clip de una parada, frotado por el scroll: en cada cambio del avance su `currentTime` es el
 * avance local del tramo por la duración (desde `HAVE_CURRENT_DATA`). Al cargar se reproduce y se
 * pausa una vez en silencio, porque iOS no pinta los cuadros buscados hasta reproducir.
 */
function WorldClip({ clip, poster, near, progress, count, index }: WorldClipProps): ReactNode {
  const ref = useRef<HTMLVideoElement>(null)
  const seek = useCallback(
    (value: number): void => {
      const video = ref.current
      if (video === null || video.readyState < HAVE_CURRENT_DATA) return
      // Solo los clips cercanos a la parada de este avance (los demás no tienen `src`).
      if (Math.abs(stageLayout(value, count).index - index) > 1) return
      if (!Number.isFinite(video.duration)) return
      video.currentTime = worldLayer(value, count, index).local * video.duration
    },
    [count, index],
  )
  useMotionValueEvent(progress, 'change', seek)
  return (
    <video
      ref={ref}
      src={near ? clip : undefined}
      poster={poster}
      preload={near ? 'auto' : 'none'}
      muted
      playsInline
      disablePictureInPicture
      className="absolute inset-0 size-full object-cover"
      onLoadedData={(event) => {
        const video = event.currentTarget
        seek(progress.get())
        video
          .play()
          .then(() => {
            video.pause()
            seek(progress.get())
          })
          .catch(() => undefined)
      }}
    />
  )
}

/** Props de {@link WorldScene}. */
interface WorldSceneProps {
  /** La parada. */
  stop: StoryWorldStop
  /** Posición de la parada, desde 0. */
  index: number
  /** Cantidad de paradas. */
  count: number
  /** Posición de la parada actual, desde 0. */
  current: number
  /** Si se puede usar video (sin menos movimiento ni ahorro de datos). */
  video: boolean
  /** Avance del scroll de la sección. */
  progress: MotionValue<number>
}

/** La capa de una parada: su poster a pantalla completa y, si hay clip y se puede, su video. */
function WorldScene({ stop, index, count, current, video, progress }: WorldSceneProps): ReactNode {
  const opacity = useTransform(progress, (value) => worldLayer(value, count, index).opacity)
  const local = useTransform(progress, (value) => worldLayer(value, count, index).local)
  const scale = useTransform(local, [0, 1], [1, CAMERA_ZOOM])
  const x = useTransform(local, [0, 1], CAMERA_DRIFT)
  const clip = video ? stop.media.clip : null
  return (
    <m.div
      data-world-stop={stop.key}
      data-current={index === current ? 'true' : undefined}
      className="absolute inset-0"
      style={{ opacity }}
    >
      {/* Sobra 1,5vw de cada lado para que la deriva de la cámara nunca deje ver el borde. */}
      <m.div
        className="absolute inset-y-0 -right-[1.5vw] -left-[1.5vw] will-change-transform"
        style={clip === null ? { x, scale } : undefined}
      >
        <Image
          src={stop.media.poster}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          priority={index === 0}
          className="object-cover"
        />
        {clip === null ? null : (
          <WorldClip
            clip={clip}
            poster={stop.media.poster}
            near={Math.abs(index - current) <= 1}
            progress={progress}
            count={count}
            index={index}
          />
        )}
      </m.div>
    </m.div>
  )
}

/** Lo que {@link StoryWorld} necesita de cada parada. */
export type StoryWorldStop = Pick<WorldStopData, 'key' | 'media'>

/** Props de {@link StoryWorld}. */
export interface StoryWorldProps {
  /** Las paradas del mundo, en el orden del relato. */
  stops: readonly StoryWorldStop[]
  /** Avance del scroll de la sección, de 0 a 1 (el de `useScrollStage`). */
  progress: MotionValue<number>
}

/**
 * La capa del mundo del mate: detrás del texto del paseo, una capa a pantalla completa por parada
 * con su poster (`object-cover`, decorativo). Se ve la parada actual; al deslizar hacia la
 * siguiente, la de la siguiente aparece encima con la curva del paseo (`worldLayer`). Sobre el
 * cuadro fijo la cámara se acerca de 1 a 1,06 y deriva de −1,5vw a 1,5vw a lo largo del tramo,
 * siempre hacia adelante. Solo se animan `opacity` y `transform`.
 *
 * Si la parada tiene clip y se puede usar video (sin `prefers-reduced-motion` ni ahorro de datos),
 * encima del poster va el video, frotado por el scroll en lugar de la cámara; solo la parada
 * actual y sus vecinas lo cargan. Las capas llevan `data-world-stop` con la clave y la actual,
 * `data-current`. Solo el primer poster carga con prioridad.
 *
 * @param props - Ver {@link StoryWorldProps}.
 * @throws {RangeError} Si no hay paradas.
 */
export function StoryWorld({ stops, progress }: StoryWorldProps): ReactNode {
  const count = stops.length
  if (count === 0) throw new RangeError('El mundo del mate necesita al menos una parada.')
  const [current, setCurrent] = useState(() => stageLayout(progress.get(), count).index)
  useMotionValueEvent(progress, 'change', (value) => {
    setCurrent(stageLayout(value, count).index)
  })
  const reduced = usePrefersReducedMotion()
  const saveData = useSaveData()
  const video = !reduced && !saveData
  return (
    <LazyMotion features={domAnimation}>
      <div aria-hidden="true" className="bg-background absolute inset-0 overflow-hidden">
        {stops.map((stop, index) => (
          <WorldScene
            key={stop.key}
            stop={stop}
            index={index}
            count={count}
            current={current}
            video={video}
            progress={progress}
          />
        ))}
      </div>
    </LazyMotion>
  )
}
