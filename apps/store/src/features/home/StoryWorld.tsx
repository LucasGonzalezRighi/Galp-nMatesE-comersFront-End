'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { m, useMotionValueEvent, useTransform } from 'motion/react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { WorldPoint, WorldStopData } from './world-media'
import { usePrefersReducedMotion } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { MateSteam } from './MateSteam'
import { stageLayout } from './stage-layout'
import {
  cssPercent,
  cssPoint,
  diveTransform,
  WORLD_DIVE,
  worldFade,
  worldLayer,
} from './world-media'
import { YerbaLeaves } from './YerbaLeaves'

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

/** El papel de una capa en la zambullida ({@link WORLD_DIVE}): la que se deja, a la que se entra o ninguno. */
type DiveRole = 'leaving' | 'arriving' | null

/** El papel de la capa `index` en la zambullida: solo si el mate y la bombilla quedan vecinos. */
function diveRole(stops: readonly StoryWorldStop[], index: number): DiveRole {
  const key = stops[index]?.key
  if (key === WORLD_DIVE.from && stops[index + 1]?.key === WORLD_DIVE.to) return 'leaving'
  if (key === WORLD_DIVE.to && stops[index - 1]?.key === WORLD_DIVE.from) return 'arriving'
  return null
}

/** Avance de la zambullida que sale de la capa `from`: de 0 a 1 mientras desliza a la siguiente. */
function diveShare(value: number, count: number, from: number): number {
  const position = -stageLayout(value, count).trackX
  return Math.min(1, Math.max(0, position - from))
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
 * pausa una vez en silencio, porque iOS no pinta los cuadros buscados hasta reproducir. Al alejarse
 * (fuera de la actual y sus vecinas) suelta lo cargado.
 */
function WorldClip({ clip, poster, near, progress, count, index }: WorldClipProps): ReactNode {
  const ref = useRef<HTMLVideoElement>(null)
  const wasNear = useRef(near)
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
  useEffect(() => {
    const video = ref.current
    // Quitar `src` no descarga el clip: hace falta `load()` para que el navegador lo suelte.
    if (video !== null && wasNear.current && !near) {
      video.removeAttribute('src')
      video.load()
    }
    wasNear.current = near
  }, [near])
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
  /** El papel de la capa en la zambullida. */
  dive: DiveRole
  /** En la capa que se deja en la zambullida, la boca del mate del cuadro que entra; si no, `null`. */
  diveTarget: WorldPoint | null
  /** Avance del scroll de la sección. */
  progress: MotionValue<number>
}

/**
 * La capa de una parada: su poster a pantalla completa con su encuadre y, si hay clip y se puede,
 * su video. Sin clip, la cámara se mueve sobre el cuadro (y entra en el mate en la zambullida) y,
 * mientras la parada es la actual, lo que se mueve en ella: hojas que caen o vapor que sube.
 */
function WorldScene({
  stop,
  index,
  count,
  current,
  video,
  dive,
  diveTarget,
  progress,
}: WorldSceneProps): ReactNode {
  const opacity = useTransform(progress, (value) => worldLayer(value, count, index).opacity)
  const local = useTransform(progress, (value) => worldLayer(value, count, index).local)
  const x = useTransform(local, [0, 1], CAMERA_DRIFT)
  const scale = useTransform(progress, (value) => {
    const camera = 1 + (CAMERA_ZOOM - 1) * worldLayer(value, count, index).local
    if (dive === null) return camera
    const scales = diveTransform(diveShare(value, count, dive === 'leaving' ? index : index - 1))
    return camera * (dive === 'leaving' ? scales.leaving : scales.arriving)
  })
  const { framing, mouth, life } = stop.media
  // En la zambullida, la capa que se deja lleva su boca adonde está la del cuadro que entra (el
  // marco mide 103 % del ancho de la capa por la deriva de la cámara, y 100 % del alto).
  const pan = useTransform(progress, (value) =>
    dive === 'leaving' ? diveTransform(diveShare(value, count, index)).pan : 0,
  )
  const panX = useTransform(pan, (share) =>
    mouth === null || diveTarget === null
      ? '0%'
      : cssPercent((diveTarget.x - mouth.x) * 1.03 * share),
  )
  const panY = useTransform(pan, (share) =>
    mouth === null || diveTarget === null ? '0%' : cssPercent((diveTarget.y - mouth.y) * share),
  )
  const clip = video ? stop.media.clip : null
  const anchor = cssPoint(framing.anchor)
  // La cámara se acerca a la boca del mate en las capas de la zambullida; en las demás, al centro.
  const origin = dive === null || mouth === null ? undefined : cssPoint(mouth)
  const alive = clip === null && index === current && mouth !== null
  return (
    <m.div
      data-world-stop={stop.key}
      data-current={index === current ? 'true' : undefined}
      className={cx('absolute inset-0', diveTarget !== null && 'will-change-transform')}
      style={diveTarget === null || clip !== null ? { opacity } : { opacity, x: panX, y: panY }}
    >
      {/* Sobra 1,5vw de cada lado para que la deriva de la cámara nunca deje ver el borde. */}
      <m.div
        className="absolute inset-y-0 -right-[1.5vw] -left-[1.5vw] will-change-transform"
        style={clip === null ? { x, scale, transformOrigin: origin } : undefined}
      >
        <Image
          src={stop.media.poster}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          priority={index === 0}
          className="object-cover"
          style={{
            objectPosition: anchor,
            transform: framing.zoom === 1 ? undefined : `scale(${String(framing.zoom)})`,
            transformOrigin: anchor,
          }}
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
        {alive && life === 'leaves' ? <YerbaLeaves target={mouth} /> : null}
        {alive && life === 'steam' ? <MateSteam origin={mouth} /> : null}
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
 * con su poster (`object-cover` con el encuadre de `WORLD_MEDIA`, decorativo). Se ve la parada
 * actual; al deslizar hacia la siguiente, la de la siguiente aparece encima con la curva del paseo
 * (`worldLayer`). Sobre el cuadro fijo la cámara se acerca de 1 a 1,06 y deriva de −1,5vw a 1,5vw a
 * lo largo del tramo, siempre hacia adelante; del mate a la bombilla, en cambio, entra por la boca
 * del mate (`diveTransform`). En la parada actual caen hojas de yerba o sube vapor, según su
 * `life`. Al final del tramo de la ronda el mundo se funde a negro (`worldFade`) antes de la
 * colección. Solo se animan `opacity` y `transform`.
 *
 * Si la parada tiene clip y se puede usar video (sin `prefers-reduced-motion` ni ahorro de datos),
 * encima del poster va el video, frotado por el scroll en lugar de la cámara; solo la parada
 * actual y sus vecinas lo cargan, y las que se alejan lo sueltan. Las capas llevan
 * `data-world-stop` con la clave y la actual, `data-current`. Solo el primer poster carga con
 * prioridad. Las funciones de Motion las carga el `ScrollStage` que lo contiene.
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
  const fade = useTransform(progress, (value) => worldFade(value, count))
  const reduced = usePrefersReducedMotion()
  const saveData = useSaveData()
  const video = !reduced && !saveData
  return (
    <div aria-hidden="true" className="bg-background absolute inset-0 overflow-hidden">
      {stops.map((stop, index) => (
        <WorldScene
          key={stop.key}
          stop={stop}
          index={index}
          count={count}
          current={current}
          video={video}
          dive={diveRole(stops, index)}
          diveTarget={
            diveRole(stops, index) === 'leaving' ? (stops[index + 1]?.media.mouth ?? null) : null
          }
          progress={progress}
        />
      ))}
      <m.div
        data-world-fade=""
        className="bg-background absolute inset-0"
        style={{ opacity: fade }}
      />
    </div>
  )
}
