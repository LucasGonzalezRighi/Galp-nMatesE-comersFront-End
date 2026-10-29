import type { HomeContent } from '@galpon/api-client'
import { HOME_COPY } from './home.copy'

/** Una escena del contenido editable (las seis que siguen a la portada). */
export type StoryScene = HomeContent['scenes'][number]

/** Clave de una escena, que también identifica su parada en el paseo del mate. */
export type StoryStopKey = StoryScene['key']

/** Una parada del paseo del mate, lista para dibujar. */
export interface StoryStopData {
  /** Clave de la escena. */
  key: StoryStopKey
  /** La escena del contenido editable (textos y botón). */
  scene: StoryScene
  /** Nombre de la parada, para el raíl y su encabezado. */
  name: string
}

/** El orden de las paradas, el de las escenas del spec 9.5. */
const STOP_ORDER: readonly StoryStopKey[] = [
  'pieces',
  'gourd',
  'bombilla',
  'yerba',
  'ritual',
  'leather',
]

/**
 * Arma las paradas del paseo del mate desde las escenas del contenido editable, en el orden del
 * spec (las tres piezas, la calabaza, el bombillón, la yerba, el ritual y el cuero). Una escena que
 * el contenido no trae no tiene parada. El aspecto de cada escena apilada vive en `HomeStory`, y
 * el de cada parada del mundo, en `WORLD_MEDIA`.
 *
 * @param scenes - Las escenas de `HomeContent`, en cualquier orden.
 * @returns Las paradas, cada una con su escena y su nombre.
 * @example
 * storyStops(content.scenes)[2]?.name // "La bombilla"
 */
export function storyStops(scenes: HomeContent['scenes']): StoryStopData[] {
  return STOP_ORDER.flatMap((key) => {
    const scene = scenes.find((candidate) => candidate.key === key)
    return scene === undefined ? [] : [{ key, scene, name: HOME_COPY.stopNames[key] }]
  })
}
