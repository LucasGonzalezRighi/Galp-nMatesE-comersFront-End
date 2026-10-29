'use client'

import type { ReactNode } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import type { StoryData } from './SceneBody'
import type { StoryStopKey } from './story-stops'
import type { SceneBackground } from './StoryScene'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'
import { HOME_COPY } from './home.copy'
import { SceneBody } from './SceneBody'
import { StoryScene } from './StoryScene'
import { StoryStage } from './StoryStage'
import { StoryVisual } from './StoryVisual'
import { WORLD_ORDER } from './world-media'

/**
 * Desde qué ventana la historia es el paseo del mate: 1024 px de ancho y 700 px de alto (en
 * celulares, tabletas y ventanas bajas, escenas apiladas). El panel de cada parada no tiene scroll
 * interno: desde ese alto entra entera a cualquier ancho porque el título, los espacios y las filas
 * de productos escalan también con el alto (`.home-stop` en `home.css`); con menos, el contador y
 * la última fila quedarían fuera de la ventana sin cómo llegar a ellos.
 */
const STAGE_QUERY = '(min-width: 1024px) and (min-height: 700px)'

/** Cómo se ve una escena apilada, igual que en el diseño. */
interface StackedLook {
  /** Fondo de la escena. */
  tone: 'dark' | 'light'
  /** De qué lado va el texto. */
  side: 'start' | 'end'
  /** Resplandor de fondo, si lleva. */
  background?: SceneBackground
  /** Palabra gigante de fondo, si lleva. */
  ghostWord?: string
  /** La pieza de la foto flotante (la del producto, no el poster del mundo). */
  visual: (story: StoryData['story']) => ProductSummary | null
  /** De qué lado va la foto. */
  visualSide: 'left' | 'right'
  /** Retardo del vaivén de la foto, en milisegundos, para que no floten al unísono. */
  floatDelay: number
}

/** Cómo se ve cada escena apilada, por su clave. */
const STACKED_LOOK: Record<StoryStopKey, StackedLook> = {
  yerba: {
    tone: 'light',
    side: 'start',
    visual: (story) => story.yerbas[0] ?? null,
    visualSide: 'right',
    floatDelay: 300,
  },
  gourd: {
    tone: 'dark',
    side: 'end',
    background: 'gourd',
    visual: (story) => story.hero,
    visualSide: 'left',
    floatDelay: 600,
  },
  pieces: {
    tone: 'light',
    side: 'start',
    visual: (story) => story.hero,
    visualSide: 'right',
    floatDelay: 0,
  },
  bombilla: {
    tone: 'dark',
    side: 'end',
    background: 'bombilla',
    ghostWord: HOME_COPY.ghostWord,
    visual: (story) => story.bombillas[0] ?? null,
    visualSide: 'left',
    floatDelay: 1200,
  },
  ritual: {
    tone: 'dark',
    side: 'start',
    background: 'hero',
    visual: (story) => story.hero,
    visualSide: 'right',
    floatDelay: 900,
  },
  leather: {
    tone: 'light',
    side: 'start',
    visual: (story) => story.hero,
    visualSide: 'right',
    floatDelay: 1500,
  },
}

/** Props de {@link StackedStory}. */
interface StackedStoryProps {
  /** Los datos de la historia. */
  data: StoryData
}

/**
 * Las seis escenas apiladas, una debajo de la otra (celular, menos movimiento y HTML del servidor),
 * en el mismo orden que el paseo ({@link WORLD_ORDER}). Una escena que el contenido no trae no se
 * dibuja.
 */
function StackedStory({ data }: StackedStoryProps): ReactNode {
  return WORLD_ORDER.map((key) => {
    const scene = data.content.scenes.find((candidate) => candidate.key === key)
    if (scene === undefined) return null
    const look = STACKED_LOOK[key]
    return (
      <StoryScene
        key={key}
        tone={look.tone}
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
        <SceneBody scene={scene} tone={look.tone} data={data} />
      </StoryScene>
    )
  })
}

/** Props de {@link HomeStory}. */
export interface HomeStoryProps {
  /** Los datos de la historia: textos, productos de las escenas, cifras y líneas. */
  data: StoryData
}

/**
 * Historia de seis escenas que sigue a la portada (spec 9.5), en el orden del relato del mundo del
 * mate: la yerba, calabaza y virola con tres cifras, "Tres piezas. Una ronda.", el bombillón, el
 * ritual del agua y el cuero.
 * Los textos salen de `HomeContent.scenes`; los productos de las escenas del bombillón y la
 * yerba, y de la primera, de `HomeContent.storyProducts` (con respaldo si alguno no se puede
 * comprar). Una escena que el contenido no trae no se dibuja.
 *
 * El servidor y la hidratación dibujan las escenas apiladas (lo que ve el celular y la lectura sin
 * movimiento). Después de hidratar, desde 1024 px de ancho y 700 px de alto y sin
 * `prefers-reduced-motion`, la historia pasa a ser el paseo del mate (`StoryStage`), antes de que se
 * llegue a ella con el scroll.
 *
 * @param props - Ver {@link HomeStoryProps}.
 */
export function HomeStory({ data }: HomeStoryProps): ReactNode {
  const wide = useMediaQuery(STAGE_QUERY)
  const reduced = usePrefersReducedMotion()
  return wide && !reduced ? <StoryStage data={data} /> : <StackedStory data={data} />
}
