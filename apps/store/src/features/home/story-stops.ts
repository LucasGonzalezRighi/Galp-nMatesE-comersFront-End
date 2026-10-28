import type { HomeContent, ProductSummary } from '@galpon/api-client'
import type { StoryProducts } from './story-products'
import type { SceneBackground } from './StoryScene'
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
  /** Fondo: `dark` (el de la tienda) o `light` (crema, con el texto oscuro). */
  tone: 'dark' | 'light'
  /** Resplandor de fondo de las paradas oscuras, o `null` si no lleva. */
  background: SceneBackground | null
  /** La pieza que muestra el mate de la derecha, o `null` si no hay ninguna comprable. */
  visual: ProductSummary | null
  /** Tamaño de la pieza: 1 es el de siempre; la calabaza se ve más grande. */
  visualScale: number
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

/** Cómo se ve cada parada, igual que su escena en el diseño. */
const STOP_LOOK: Record<
  StoryStopKey,
  Pick<StoryStopData, 'tone' | 'background' | 'visualScale'>
> = {
  pieces: { tone: 'light', background: null, visualScale: 1 },
  gourd: { tone: 'dark', background: 'gourd', visualScale: 1.12 },
  bombilla: { tone: 'dark', background: 'bombilla', visualScale: 1 },
  yerba: { tone: 'light', background: null, visualScale: 1 },
  ritual: { tone: 'dark', background: 'hero', visualScale: 1 },
  leather: { tone: 'light', background: null, visualScale: 1 },
}

/** La pieza de cada parada: el primer bombillón, la primera yerba o, en las demás, el mate de la portada. */
function visualOf(key: StoryStopKey, story: StoryProducts): ProductSummary | null {
  if (key === 'bombilla') return story.bombillas[0] ?? null
  if (key === 'yerba') return story.yerbas[0] ?? null
  return story.hero
}

/**
 * Arma las paradas del paseo del mate desde las escenas del contenido editable y los productos de
 * la historia, en el orden del spec (las tres piezas, la calabaza, el bombillón, la yerba, el
 * ritual y el cuero). Una escena que el contenido no trae no tiene parada.
 *
 * @param scenes - Las escenas de `HomeContent`, en cualquier orden.
 * @param story - Los productos de la historia, ya resueltos contra el catálogo.
 * @returns Las paradas, cada una con su nombre, su fondo y la pieza que muestra el mate.
 * @example
 * storyStops(content.scenes, story)[2]?.visual?.name // "Bombillón Premium Curvo"
 */
export function storyStops(scenes: HomeContent['scenes'], story: StoryProducts): StoryStopData[] {
  return STOP_ORDER.flatMap((key) => {
    const scene = scenes.find((candidate) => candidate.key === key)
    if (scene === undefined) return []
    return [
      {
        key,
        scene,
        name: HOME_COPY.stopNames[key],
        ...STOP_LOOK[key],
        visual: visualOf(key, story),
      },
    ]
  })
}
