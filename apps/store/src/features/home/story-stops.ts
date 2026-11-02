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

/**
 * El encuadre de la foto de fondo de una parada: de qué punto se ancla (`object-position`) y cuánto
 * se acerca desde ese mismo punto. Es fijo por parada: no cambia con el scroll.
 */
export interface BackdropFraming {
  /** Anclaje de la foto, dos porcentajes (horizontal y vertical), por ejemplo `'100% 50%'`. */
  objectPosition: string
  /** Cuánto se acerca la foto desde el anclaje: 1 la deja como está. */
  scale: number
}

/** Una parada del mate en escritorio. */
export interface MateStop {
  /** Clave de la parada. */
  key: MateStopKey
  /** Nombre de la parada, para el raíl y su encabezado. */
  name: string
  /** Foto de fondo (`public/hero/world`), que se muestra nítida y apenas oscurecida. */
  backdrop: string
  /** Encuadre de la foto de fondo, para que el mate 3D no tape lo importante de la foto. */
  framing: BackdropFraming
}

/**
 * Las tres paradas del mate, en orden: la portada ("El mate", donde se llena de yerba), la
 * bombilla y el agua. Son tantas como `MATE_STOP_COUNT` de `mate3d/keyframes.ts`.
 *
 * Encuadres (Lucas, 2026-10-29: "correr la foto de fondo"): en la portada el mate 3D, a la derecha,
 * tapaba la bombilla del mate de la foto mientras se llena; la foto va anclada a la derecha y
 * acercada 1,2 desde ahí, así su mate y su bombilla se corren a la izquierda y quedan entre el texto
 * y el mate 3D (medido a 1440 × 900 y a 1905 × 950, también con el mate volcado y el paquete). En
 * la bombilla, lo mismo con 1,1: el borde del mate de la foto sale de atrás del mate 3D, que queda
 * sobre la mano. En el agua el mate 3D tapa solo la pava: queda centrada.
 *
 * Desvío abierto del Ruling MR-11 (2), que pide el mate y la bombilla de la foto a la DERECHA del
 * mate 3D o fuera de cuadro: la foto (1600 × 893) solo se recorta en vertical a 1905 px, así que
 * correrlos a la derecha pide un zoom de 1,9× o más (se vería borrosa). Hoy quedan a la izquierda
 * del mate 3D, entre el texto y él, sin que este los tape; a 1440 el mate de la foto queda en
 * parte detrás del título. Cambiar eso es decisión de Lucas: aceptarlo o cambiar la composición
 * (otra foto, o un recorte de `pieces.jpg` con el mate a la derecha).
 */
export const MATE_STOPS: readonly MateStop[] = [
  {
    key: 'hero',
    name: HOME_COPY.stopNames.hero,
    backdrop: MATE_PHOTO,
    framing: { objectPosition: '100% 50%', scale: 1.2 },
  },
  {
    key: 'bombilla',
    name: HOME_COPY.stopNames.bombilla,
    backdrop: '/hero/world/bombilla.jpg',
    framing: { objectPosition: '100% 50%', scale: 1.1 },
  },
  {
    key: 'ritual',
    name: HOME_COPY.stopNames.ritual,
    backdrop: '/hero/world/ritual.jpg',
    framing: { objectPosition: '50% 50%', scale: 1 },
  },
]

/** Dos porcentajes separados por un espacio: el anclaje de una foto. */
const OBJECT_POSITION = /^\d+(\.\d+)?% \d+(\.\d+)?%$/

/**
 * El estilo con que se dibuja una foto de fondo con su encuadre: `object-position` en el anclaje y,
 * si se acerca, `transform: scale(…)` desde ese mismo punto (`transform-origin`), así el anclaje
 * queda en su lugar y el resto de la foto se aleja de él. Va en línea y fijo: no se recalcula con
 * el scroll.
 *
 * @param framing - El encuadre de la parada.
 * @returns El estilo para la imagen.
 * @throws {RangeError} Si la escala no es un número de 1 o más o el anclaje no son dos porcentajes.
 * @example
 * backdropFramingStyle({ objectPosition: '100% 50%', scale: 1.3 })
 * // { objectPosition: '100% 50%', transform: 'scale(1.3)', transformOrigin: '100% 50%' }
 */
export function backdropFramingStyle({ objectPosition, scale }: BackdropFraming): CSSProperties {
  if (!Number.isFinite(scale) || scale < 1) {
    throw new RangeError(
      `La escala de la foto de fondo tiene que ser un número de 1 o más; se recibió ${String(scale)}.`,
    )
  }
  if (!OBJECT_POSITION.test(objectPosition)) {
    throw new RangeError(
      `El anclaje de la foto de fondo tienen que ser dos porcentajes (por ejemplo "100% 50%"); se recibió "${objectPosition}".`,
    )
  }
  if (scale === 1) return { objectPosition }
  return { objectPosition, transform: `scale(${String(scale)})`, transformOrigin: objectPosition }
}

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
