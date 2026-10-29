import type { CSSProperties } from 'react'
import type { HomeContent } from '@galpon/api-client'
import { HOME_COPY } from './home.copy'
import { stageLayout } from './stage-layout'

/** Una escena del contenido editable. */
export type StoryScene = HomeContent['scenes'][number]

/**
 * Las escenas que el inicio muestra después de la portada: la bombilla y el agua (la del ritual).
 * Las otras cuatro siguen editables en el admin, pero no se muestran.
 */
export type StorySceneKey = 'bombilla' | 'ritual'

/** Una escena que el inicio muestra. */
export type HomeStoryScene = StoryScene & { key: StorySceneKey }

/** El orden de las escenas del inicio. */
export const STORY_SCENE_KEYS: readonly StorySceneKey[] = ['bombilla', 'ritual']

/**
 * Las escenas del contenido editable que el inicio muestra, en su orden ({@link STORY_SCENE_KEYS}).
 * Una escena que el contenido no trae no se muestra.
 *
 * @param scenes - Las escenas de `HomeContent`, en cualquier orden.
 * @returns La bombilla y el ritual, las que estén.
 * @example
 * storyScenes(content.scenes).map((scene) => scene.key) // ["bombilla", "ritual"]
 */
export function storyScenes(scenes: HomeContent['scenes']): HomeStoryScene[] {
  return STORY_SCENE_KEYS.flatMap((key) => {
    const scene = scenes.find((candidate): candidate is HomeStoryScene => candidate.key === key)
    return scene === undefined ? [] : [scene]
  })
}

/** La foto del mate (el cuadro k1): fondo de la portada y respaldo del mate 3D sin WebGL. */
export const MATE_PHOTO = '/hero/world/pieces.jpg'

/**
 * Encuadre de la foto del mate desde 1024 px (`.home-hero-poster` en `home.css`): anclada a la
 * izquierda y acercada 1,15, así el mate queda a la derecha, lejos de la columna de texto.
 */
export const MATE_PHOTO_FRAMING = {
  '--poster-anchor': '0% 50%',
  '--poster-zoom': '1.15',
} as CSSProperties

/** Clave de una parada del mate: la portada y las dos escenas. */
export type MateStopKey = 'hero' | StorySceneKey

/** Una parada del mate en escritorio. */
export interface MateStop {
  /** Clave de la parada. */
  key: MateStopKey
  /** Nombre de la parada, para el raíl y su encabezado. */
  name: string
  /** Foto de fondo (`public/hero/world`), que se muestra nítida y apenas oscurecida. */
  backdrop: string
}

/**
 * Las tres paradas del mate, en orden: la portada ("El mate", donde se llena de yerba), la
 * bombilla y el agua. Son tantas como `MATE_STOP_COUNT` de `mate3d/keyframes.ts`.
 */
export const MATE_STOPS: readonly MateStop[] = [
  { key: 'hero', name: HOME_COPY.stopNames.hero, backdrop: MATE_PHOTO },
  { key: 'bombilla', name: HOME_COPY.stopNames.bombilla, backdrop: '/hero/world/bombilla.jpg' },
  { key: 'ritual', name: HOME_COPY.stopNames.ritual, backdrop: '/hero/world/ritual.jpg' },
]

/**
 * La opacidad del fondo de una parada para un avance del scroll: 1 mientras su parada es la de
 * abajo; mientras la anterior desliza hacia ella sube con la curva de `stageLayout`, por encima
 * de la anterior (un fundido cruzado sin bajar el brillo); 0 en el resto.
 *
 * @param progress - Avance del scroll de la sección, de 0 a 1; fuera de ese rango se recorta.
 * @param count - Cantidad de paradas, un entero mayor o igual a 1.
 * @param index - El fondo, un entero de 0 a `count - 1`.
 * @returns La opacidad, de 0 a 1.
 * @throws {RangeError} Si `progress`, `count` o `index` no son válidos.
 * @example
 * backdropOpacity(0.5, 3, 1) // 1
 */
export function backdropOpacity(progress: number, count: number, index: number): number {
  // `stageLayout` valida el avance y la cantidad.
  const { trackX } = stageLayout(progress, count)
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(
      `El fondo tiene que ser un entero de 0 a ${String(count - 1)}; se recibió ${String(index)}.`,
    )
  }
  // Posición continua del recorrido: 0, 1, 2… con decimales mientras desliza.
  const position = -trackX
  const below = Math.floor(position)
  if (index === below) return 1
  return index === below + 1 ? position - below : 0
}
