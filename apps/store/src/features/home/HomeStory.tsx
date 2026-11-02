'use client'

import type { ReactNode } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import type { StoryData } from './SceneBody'
import type { HomeStoryScene, StorySceneKey } from './story-stops'
import type { SceneBackground } from './StoryScene'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'
import { HOME_COPY } from './home.copy'
import { MateStage } from './MateStage'
import { SceneBody } from './SceneBody'
import { STORY_SCENE_KEYS, storyScenes } from './story-stops'
import { StoryScene } from './StoryScene'
import { StoryVisual } from './StoryVisual'

/**
 * Desde qué ventana el inicio es el mate 3D: 1024 px de ancho y 700 px de alto (en celulares,
 * tabletas y ventanas bajas, portada y escenas apiladas). El panel de cada parada no tiene scroll
 * interno: desde ese alto entra entero a cualquier ancho porque el título, los espacios y las filas
 * de productos escalan también con el alto (`.home-stop` en `home.css`).
 */
const STAGE_QUERY = '(min-width: 1024px) and (min-height: 700px)'

/** Cómo se ve una escena apilada, igual que en el diseño. */
interface StackedLook {
  /** De qué lado va el texto. */
  side: 'start' | 'end'
  /** Resplandor de fondo. */
  background: SceneBackground
  /** Palabra gigante de fondo, si lleva. */
  ghostWord?: string
  /** La pieza de la foto flotante (la del producto). */
  visual: (story: StoryData['story']) => ProductSummary | null
  /** De qué lado va la foto. */
  visualSide: 'left' | 'right'
  /** Retardo del vaivén de la foto, en milisegundos, para que no floten al unísono. */
  floatDelay: number
}

/** Cómo se ve cada escena apilada, por su clave. Las dos son oscuras. */
const STACKED_LOOK: Record<StorySceneKey, StackedLook> = {
  bombilla: {
    side: 'end',
    background: 'bombilla',
    ghostWord: HOME_COPY.ghostWord,
    visual: (story) => story.bombillas[0] ?? null,
    visualSide: 'left',
    floatDelay: 1200,
  },
  ritual: {
    side: 'start',
    background: 'hero',
    visual: (story) => story.hero,
    visualSide: 'right',
    floatDelay: 900,
  },
}

/** Props de {@link StackedStory}. */
interface StackedStoryProps {
  /** Las escenas que el contenido trae, en orden. */
  scenes: readonly HomeStoryScene[]
  /** Los datos de la historia. */
  data: StoryData
}

/** Las escenas apiladas, una debajo de la otra (servidor, celular y menos movimiento). */
function StackedStory({ scenes, data }: StackedStoryProps): ReactNode {
  return scenes.map((scene) => {
    const look = STACKED_LOOK[scene.key]
    return (
      <StoryScene
        key={scene.key}
        tone="dark"
        side={look.side}
        background={look.background}
        ghostWord={look.ghostWord}
        visual={
          <StoryVisual
            product={look.visual(data.story)}
            side={look.visualSide}
            floatDelay={look.floatDelay}
          />
        }
      >
        <SceneBody scene={scene} tone="dark" data={data} />
      </StoryScene>
    )
  })
}

/** Props de {@link HomeStory}. */
export interface HomeStoryProps {
  /** La portada que dibuja el servidor (`HomeHero`). */
  hero: ReactNode
  /** Los datos de la historia y de la portada. */
  data: StoryData
}

/**
 * El comienzo del inicio, hasta la colección (spec 9.5): la portada y las escenas de la bombilla y
 * del agua (la del ritual). Las otras cuatro escenas siguen editables en el admin, pero no se
 * muestran; una escena que el contenido no trae no se dibuja.
 *
 * El servidor y la hidratación dibujan la portada (`hero`) y las dos escenas apiladas, lo que ve el
 * celular y la lectura sin movimiento. Después de hidratar, desde 1024 px de ancho y 700 px de alto,
 * sin `prefers-reduced-motion` y con las dos escenas en el contenido, todo eso pasa a ser el mate 3D
 * (`MateStage`), que repite el texto de la portada en su primera parada: la portada no se dibuja dos
 * veces.
 *
 * @param props - Ver {@link HomeStoryProps}.
 */
export function HomeStory({ hero, data }: HomeStoryProps): ReactNode {
  const wide = useMediaQuery(STAGE_QUERY)
  const reduced = usePrefersReducedMotion()
  const scenes = storyScenes(data.content.scenes)
  if (wide && !reduced && scenes.length === STORY_SCENE_KEYS.length) {
    return <MateStage data={data} />
  }
  return (
    <>
      {hero}
      <StackedStory scenes={scenes} data={data} />
    </>
  )
}
