'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import type { ProductSummary } from '@galpon/api-client'
import type { StoryData } from './SceneBody'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'
import { HeroCarousel } from './HeroCarousel'
import { MATE_STOPS, STORY_SCENE_KEYS, storyScenes } from './story-stops'

/**
 * Desde qué ventana el inicio es el mate 3D: 1024 px de ancho y 700 px de alto (en celulares,
 * tabletas y ventanas bajas, el carrusel del v4). El panel de cada parada no tiene scroll interno:
 * desde ese alto entra entero a cualquier ancho porque el título, los espacios y las filas de
 * productos escalan también con el alto (`.home-stop` en `home.css`).
 */
const STAGE_QUERY = '(min-width: 1024px) and (min-height: 700px)'

/**
 * Lo que ocupa el mate 3D mientras baja su código: el alto del escenario (`(paradas + 1) × 100svh`,
 * como `ScrollStage`) con el fondo de la página. Nunca el carrusel: en escritorio con 3D no se
 * tiene que ver ni un cuadro (la intro tapa la carga; si el código llegara después, se ve el fondo).
 */
function StagePending(): ReactNode {
  const height = `${String((MATE_STOPS.length + 1) * 100)}svh`
  return (
    <div aria-hidden="true" data-stage-pending="" className="bg-background" style={{ height }} />
  )
}

/**
 * El mate 3D, cargado aparte (`ssr: false`): su código (el escenario, las paradas, el raíl, la
 * zambullida y la escena de three.js) no baja en el celular ni con menos movimiento.
 */
const MateStage = dynamic(() => import('./MateStage').then((module) => module.MateStage), {
  ssr: false,
  loading: StagePending,
})

/** Props de {@link HomeStory}. */
export interface HomeStoryProps {
  /** Los datos de la historia (las paradas del mate 3D y la portada). */
  data: StoryData
  /** Las piezas del carrusel del v4 (`heroSlides`). */
  slides: ProductSummary[]
}

/**
 * El comienzo del inicio, hasta la colección (spec 9.5, Rulings IC-4 e IC-8). En escritorio con
 * movimiento es el mate 3D de tres paradas (`MateStage`: la portada, la bombilla y el agua); en
 * todos los demás casos (menos de 1024 px de ancho o de 700 px de alto, `prefers-reduced-motion`
 * o un contenido sin las dos escenas) es el hero carrusel del v4 (`HeroCarousel`), sin escenas
 * apiladas.
 *
 * El servidor y la hidratación dibujan el carrusel (no saben del ancho de la ventana). En
 * escritorio con 3D la intro del inicio lo tapa desde el primer cuadro (la tapa del servidor y,
 * al hidratar, su capa), y en el mismo render en que se va la tapa esto pasa a ser el mate 3D: el
 * carrusel nunca se llega a ver.
 *
 * @param props - Ver {@link HomeStoryProps}.
 */
export function HomeStory({ data, slides }: HomeStoryProps): ReactNode {
  const wide = useMediaQuery(STAGE_QUERY)
  const reduced = usePrefersReducedMotion()
  const scenes = storyScenes(data.content.scenes)
  if (wide && !reduced && scenes.length === STORY_SCENE_KEYS.length) {
    return <MateStage data={data} />
  }
  return (
    <HeroCarousel
      hero={data.content.hero}
      slides={slides}
      kitDiscountLabel={data.kitDiscountLabel}
    />
  )
}
