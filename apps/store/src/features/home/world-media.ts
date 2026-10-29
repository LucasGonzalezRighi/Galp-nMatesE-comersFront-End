import type { HomeContent } from '@galpon/api-client'
import type { StoryProducts } from './story-products'
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
}

/** La media de una parada que por ahora solo tiene su poster de 1600 × 893. */
function posterOnly(key: StoryStopKey): WorldMedia {
  return { poster: `/hero/world/${key}.jpg`, width: 1600, height: 893, clip: null }
}

/**
 * El cuadro y el clip de cada parada del mundo del mate. Todavía no hay clips: cuando se generen,
 * cada uno va en `'/hero/world/<clave>.mp4'` y se pone acá.
 */
export const WORLD_MEDIA: Record<StoryStopKey, WorldMedia> = {
  yerba: posterOnly('yerba'),
  // `gourd` (el galpón) usa provisoriamente un cuadro armado con la foto real del mate de calabaza
  // (bordes cálidos desenfocados); `gourd.jpg` se reemplaza cuando se genere el del taller.
  gourd: posterOnly('gourd'),
  pieces: posterOnly('pieces'),
  bombilla: posterOnly('bombilla'),
  ritual: posterOnly('ritual'),
  leather: posterOnly('leather'),
}

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
 * @param story - Los productos de la historia, ya resueltos contra el catálogo.
 * @returns Las paradas en el orden del relato, cada una con su media.
 * @example
 * worldStops(content.scenes, story)[0]?.media.poster // "/hero/world/yerba.jpg"
 */
export function worldStops(scenes: HomeContent['scenes'], story: StoryProducts): WorldStopData[] {
  const stops = storyStops(scenes, story)
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
