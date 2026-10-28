'use client'

import type { ReactNode } from 'react'
import type { StoryData } from './SceneBody'
import type { StoryScene as Scene } from './story-stops'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'
import { HOME_COPY } from './home.copy'
import { SceneBody } from './SceneBody'
import { StoryScene } from './StoryScene'
import { StoryStage } from './StoryStage'
import { StoryVisual } from './StoryVisual'

/**
 * Desde qué ventana la historia es el paseo del mate: 1024 px de ancho y 700 px de alto (en
 * celulares, tabletas y ventanas bajas, escenas apiladas). Cada parada necesita cerca de 600 px de
 * alto y el panel no tiene scroll interno; con menos alto el contador y la última fila de productos
 * quedan fuera de la ventana y no hay cómo llegar a ellos.
 */
const STAGE_QUERY = '(min-width: 1024px) and (min-height: 700px)'

/** Busca la escena por su clave; si el contenido no la trae, esa escena no se dibuja. */
function sceneOf(scenes: readonly Scene[], key: Scene['key']): Scene | undefined {
  return scenes.find((scene) => scene.key === key)
}

/** Props de {@link StackedStory}. */
interface StackedStoryProps {
  /** Los datos de la historia. */
  data: StoryData
}

/** Las seis escenas apiladas, una debajo de la otra (celular, menos movimiento y HTML del servidor). */
function StackedStory({ data }: StackedStoryProps): ReactNode {
  const { content, story } = data
  const pieces = sceneOf(content.scenes, 'pieces')
  const gourd = sceneOf(content.scenes, 'gourd')
  const bombilla = sceneOf(content.scenes, 'bombilla')
  const yerba = sceneOf(content.scenes, 'yerba')
  const ritual = sceneOf(content.scenes, 'ritual')
  const leather = sceneOf(content.scenes, 'leather')
  return (
    <>
      {pieces === undefined ? null : (
        <StoryScene
          tone="light"
          side="start"
          visual={<StoryVisual product={story.hero} side="right" />}
        >
          <SceneBody scene={pieces} tone="light" data={data} />
        </StoryScene>
      )}
      {gourd === undefined ? null : (
        <StoryScene
          tone="dark"
          side="end"
          background="gourd"
          visual={<StoryVisual product={story.hero} side="left" floatDelay={600} />}
        >
          <SceneBody scene={gourd} tone="dark" data={data} />
        </StoryScene>
      )}
      {bombilla === undefined ? null : (
        <StoryScene
          tone="dark"
          side="end"
          background="bombilla"
          ghostWord={HOME_COPY.ghostWord}
          visual={
            <StoryVisual product={story.bombillas[0] ?? null} side="left" floatDelay={1200} />
          }
        >
          <SceneBody scene={bombilla} tone="dark" data={data} />
        </StoryScene>
      )}
      {yerba === undefined ? null : (
        <StoryScene
          tone="light"
          side="start"
          visual={<StoryVisual product={story.yerbas[0] ?? null} side="right" floatDelay={300} />}
        >
          <SceneBody scene={yerba} tone="light" data={data} />
        </StoryScene>
      )}
      {ritual === undefined ? null : (
        <StoryScene
          tone="dark"
          side="start"
          background="hero"
          visual={<StoryVisual product={story.hero} side="right" floatDelay={900} />}
        >
          <SceneBody scene={ritual} tone="dark" data={data} />
        </StoryScene>
      )}
      {leather === undefined ? null : (
        <StoryScene
          tone="light"
          side="start"
          visual={<StoryVisual product={story.hero} side="right" floatDelay={1500} />}
        >
          <SceneBody scene={leather} tone="light" data={data} />
        </StoryScene>
      )}
    </>
  )
}

/** Props de {@link HomeStory}. */
export interface HomeStoryProps {
  /** Los datos de la historia: textos, productos de las escenas, cifras y líneas. */
  data: StoryData
}

/**
 * Historia de seis escenas que sigue a la portada (spec 9.5): "Tres piezas. Una ronda.",
 * calabaza y virola con tres cifras, el bombillón, la yerba, el ritual del agua y el cuero.
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
