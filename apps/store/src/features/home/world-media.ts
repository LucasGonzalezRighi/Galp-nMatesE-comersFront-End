import type { HomeContent } from '@galpon/api-client'
import type { StoryStopData, StoryStopKey } from './story-stops'
import { stageLayout } from './stage-layout'
import { storyStops } from './story-stops'

/** El orden del relato del mundo del mate: el yerbal, el galpón, el mate, la bombilla, el ritual y la ronda. */
export const WORLD_ORDER: readonly StoryStopKey[] = [
  'yerba',
  'gourd',
  'pieces',
  'bombilla',
  'ritual',
  'leather',
]

/** Un punto de la capa de una parada, en fracciones de su ancho y de su alto (de 0 a 1). */
export interface WorldPoint {
  /** Desde el borde izquierdo. */
  x: number
  /** Desde el borde de arriba. */
  y: number
}

/**
 * Una fracción de la capa como porcentaje CSS, redondeado a un decimal.
 *
 * @param value - La fracción (0,61 es el 61 %); puede salir de 0 a 1 para lo que sobresale.
 * @returns Por ejemplo `"61%"`.
 * @throws {RangeError} Si `value` no es un número finito.
 * @example
 * cssPercent(0.61) // "61%"
 */
export function cssPercent(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`La fracción tiene que ser un número finito; se recibió ${String(value)}.`)
  }
  return `${String(Math.round(value * 1000) / 10)}%`
}

/**
 * Un punto de la capa como posición CSS (para `object-position` o `transform-origin`).
 *
 * @param point - El punto, en fracciones del ancho y del alto.
 * @returns Por ejemplo `"61% 27%"`.
 * @throws {RangeError} Si alguna coordenada no es un número finito.
 * @example
 * cssPoint({ x: 0, y: 0.5 }) // "0% 50%"
 */
export function cssPoint(point: WorldPoint): string {
  return `${cssPercent(point.x)} ${cssPercent(point.y)}`
}

/** Cómo se encuadra un poster en la pantalla. */
export interface WorldFraming {
  /** El punto del cuadro que queda fijo: su `object-position` y el centro de su acercamiento. */
  anchor: WorldPoint
  /** Acercamiento fijo del poster alrededor del ancla, desde 1 (el cuadro entero cubriendo la capa). */
  zoom: number
}

/** Lo que se mueve sobre el cuadro fijo de una parada: hojas de yerba que caen, vapor que sube o nada. */
export type WorldLife = 'leaves' | 'steam' | null

/** El cuadro y el clip de una parada del mundo del mate. */
export interface WorldMedia {
  /** Ruta del poster (el cuadro fijo, `public/hero/world/<clave>.jpg`). */
  poster: string
  /** Ancho del poster, en px. */
  width: number
  /** Alto del poster, en px. */
  height: number
  /** Ruta del clip que frota el scroll (`public/hero/world/<clave>.mp4`), o `null` si todavía no hay. */
  clip: string | null
  /** Encuadre del poster. */
  framing: WorldFraming
  /**
   * Dónde queda la boca del mate en la capa (medida a 16:10, con el encuadre), o `null` si no hay
   * un mate a la vista: el centro de la zambullida, adonde caen las hojas y de donde sube el vapor.
   */
  mouth: WorldPoint | null
  /** Lo que se mueve sobre el cuadro fijo mientras la parada es la actual. */
  life: WorldLife
}

/** El encuadre de siempre: el centro del cuadro, sin acercar. */
const CENTERED: WorldFraming = { anchor: { x: 0.5, y: 0.5 }, zoom: 1 }

/** La media de una parada que por ahora solo tiene su poster de 1600 × 893. */
function posterOnly(
  key: StoryStopKey,
  look: Pick<WorldMedia, 'framing' | 'mouth' | 'life'>,
): WorldMedia {
  return { poster: `/hero/world/${key}.jpg`, width: 1600, height: 893, clip: null, ...look }
}

/**
 * El cuadro y el clip de cada parada del mundo del mate. Todavía no hay clips: cuando se generen,
 * cada uno va en `'/hero/world/<clave>.mp4'` y se pone acá (el clip trae su propio movimiento:
 * `life` y `mouth` se revisan con él).
 */
export const WORLD_MEDIA: Record<StoryStopKey, WorldMedia> = {
  yerba: posterOnly('yerba', { framing: CENTERED, mouth: null, life: null }),
  // `gourd` (el galpón) usa provisoriamente un cuadro armado con la foto real del mate de calabaza
  // (bordes cálidos desenfocados); `gourd.jpg` se reemplaza cuando se genere el del taller.
  gourd: posterOnly('gourd', { framing: CENTERED, mouth: null, life: null }),
  // El mate va a la derecha, lejos de la columna de texto y de sus botones "+": el cuadro solo
  // sobra 65 px a los costados a 1440 × 900, así que se ancla a la izquierda y se acerca 1,15.
  pieces: posterOnly('pieces', {
    framing: { anchor: { x: 0, y: 0.5 }, zoom: 1.15 },
    mouth: { x: 0.61, y: 0.27 },
    life: 'leaves',
  }),
  // Acercado 1,12: la zambullida lo trae desde 0,92 alrededor de la boca sin dejar ver su borde.
  bombilla: posterOnly('bombilla', {
    framing: { anchor: { x: 0.5, y: 0.5 }, zoom: 1.12 },
    mouth: { x: 0.5, y: 0.44 },
    life: null,
  }),
  ritual: posterOnly('ritual', { framing: CENTERED, mouth: { x: 0.48, y: 0.56 }, life: 'steam' }),
  leather: posterOnly('leather', {
    framing: CENTERED,
    mouth: { x: 0.49, y: 0.29 },
    life: 'steam',
  }),
}

/** De qué parada a cuál se entra al mate. */
export interface WorldDive {
  /** La parada que se deja: su cuadro se acerca a la boca del mate. */
  from: StoryStopKey
  /** La parada a la que se entra: su cuadro llega desde un poco más lejos. */
  to: StoryStopKey
}

/** La zambullida: al deslizar de "El mate" (k1) a "La bombilla" (k2), la cámara entra en el mate. */
export const WORLD_DIVE: WorldDive = { from: 'pieces', to: 'bombilla' }

/** Una parada del mundo del mate: la del paseo más su cuadro y su clip. */
export interface WorldStopData extends StoryStopData {
  /** El cuadro y el clip de la parada. */
  media: WorldMedia
}

/**
 * Arma las paradas del mundo del mate: las de {@link storyStops}, en el orden del relato
 * ({@link WORLD_ORDER}) y con su media ({@link WORLD_MEDIA}). Una escena que el contenido no trae
 * no tiene parada.
 *
 * @param scenes - Las escenas de `HomeContent`, en cualquier orden.
 * @returns Las paradas en el orden del relato, cada una con su media.
 * @example
 * worldStops(content.scenes)[0]?.media.poster // "/hero/world/yerba.jpg"
 */
export function worldStops(scenes: HomeContent['scenes']): WorldStopData[] {
  const stops = storyStops(scenes)
  return WORLD_ORDER.flatMap((key) => {
    const stop = stops.find((candidate) => candidate.key === key)
    return stop === undefined ? [] : [{ ...stop, media: WORLD_MEDIA[key] }]
  })
}

/** Cómo se ve la capa de una parada del mundo para un avance del scroll. */
export interface WorldLayer {
  /**
   * Opacidad, de 0 a 1: 1 mientras su parada es la de abajo; mientras la anterior desliza hacia
   * ella sube con la curva de `stageLayout`; 0 en el resto.
   */
  opacity: number
  /** Avance dentro del tramo de su parada, de 0 a 1: mueve la cámara y frota el clip. */
  local: number
}

/**
 * Reparte el avance del scroll entre las capas del mundo del mate. Cada capa se ve entera durante
 * su parada y, en el deslizamiento hacia la siguiente, la de la siguiente aparece encima con la
 * misma curva que el paseo (`stageLayout`): un fundido cruzado sin bajar el brillo. El avance local
 * recorre el tramo de la parada (una ventana de scroll) y nunca retrocede.
 *
 * @param progress - Avance del scroll de la sección, de 0 a 1; fuera de ese rango se recorta.
 * @param count - Cantidad de paradas, un entero mayor o igual a 1.
 * @param index - La capa, un entero de 0 a `count - 1`.
 * @returns La opacidad de la capa y su avance local.
 * @throws {RangeError} Si `progress`, `count` o `index` no son válidos.
 * @example
 * worldLayer(0.25, 4, 1) // { opacity: 1, local: 0 }
 */
export function worldLayer(progress: number, count: number, index: number): WorldLayer {
  const { trackX } = stageLayout(progress, count)
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(
      `La capa tiene que ser un entero de 0 a ${String(count - 1)}; se recibió ${String(index)}.`,
    )
  }
  // Posición continua del paseo: 0, 1, 2… con decimales mientras desliza.
  const position = -trackX
  const below = Math.floor(position)
  const opacity = index === below ? 1 : index === below + 1 ? position - below : 0
  const local = Math.min(1, Math.max(0, Math.min(1, Math.max(0, progress)) * count - index))
  return { opacity, local }
}

/** Cuánto se acerca a la boca del mate el cuadro que se deja en la zambullida. */
const DIVE_LEAVING = 2.2

/** Desde qué escala llega el cuadro al que se entra en la zambullida. */
const DIVE_ARRIVING = 0.92

/** Parte de la zambullida en que la boca del mate que se deja llega adonde está la del cuadro que entra. */
const DIVE_PAN_SHARE = 0.5

/** Curva que arranca y termina despacio (`smoothstep`). */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Cómo se mueven los dos cuadros de la zambullida. */
export interface DiveTransform {
  /** Escala del cuadro que se deja ("El mate"), alrededor de la boca del mate: de 1 a 2,2. */
  leaving: number
  /** Escala del cuadro al que se entra ("La bombilla"), alrededor de su boca: de 0,92 a 1. */
  arriving: number
  /**
   * Cuánto del camino hizo la boca del mate que se deja hacia la boca del cuadro que entra, de 0 a
   * 1 (llega a la mitad de la zambullida): así las dos bocas coinciden mientras el fundido se ve.
   */
  pan: number
}

/**
 * La zambullida dentro del mate ({@link WORLD_DIVE}) para un avance de su deslizamiento: el cuadro
 * que se deja se acerca de 1 a 2,2 alrededor de la boca del mate y la lleva hasta donde está la
 * boca del cuadro que llega (en la primera mitad, con una curva suave); el que llega (encima, con
 * el fundido de {@link worldLayer}) pasa de 0,92 a 1 alrededor de su boca. Las escalas son
 * geométricas, así la cámara avanza a velocidad pareja, y nada retrocede. Las escalas se
 * multiplican por la de la cámara de cada capa.
 *
 * @param progress - Avance del deslizamiento de "El mate" a "La bombilla", de 0 a 1 (el mismo
 *   que la opacidad del cuadro que llega).
 * @returns La escala de cada cuadro.
 * @throws {RangeError} Si `progress` no es un número de 0 a 1.
 * @example
 * diveTransform(0) // { leaving: 1, arriving: 0.92, pan: 0 }
 */
export function diveTransform(progress: number): DiveTransform {
  if (!(progress >= 0 && progress <= 1)) {
    throw new RangeError(
      `El avance de la zambullida tiene que ser un número de 0 a 1; se recibió ${String(progress)}.`,
    )
  }
  return {
    leaving: DIVE_LEAVING ** progress,
    arriving: DIVE_ARRIVING ** (1 - progress),
    pan: smoothstep(Math.min(1, progress / DIVE_PAN_SHARE)),
  }
}

/** Parte final del tramo de la última parada en que el mundo se funde a negro. */
export const FADE_SHARE = 0.35

/**
 * El fundido a negro al salir de la ronda: la opacidad de la capa del color de fondo que tapa el
 * mundo en el {@link FADE_SHARE} final del tramo de la última parada, para separar el mundo de la
 * colección que sigue. Antes vale 0; al final del paseo, 1. Nunca retrocede.
 *
 * @param progress - Avance del scroll de la sección, de 0 a 1; fuera de ese rango se recorta.
 * @param count - Cantidad de paradas, un entero mayor o igual a 1.
 * @returns La opacidad del negro, de 0 a 1.
 * @throws {RangeError} Si `progress` no es un número o `count` no es un entero mayor o igual a 1.
 * @example
 * worldFade(1, 6) // 1
 */
export function worldFade(progress: number, count: number): number {
  // `stageLayout` valida el avance y la cantidad.
  stageLayout(progress, count)
  const position = Math.min(1, Math.max(0, progress)) * count
  return Math.min(1, Math.max(0, 1 - (count - position) / FADE_SHARE))
}
