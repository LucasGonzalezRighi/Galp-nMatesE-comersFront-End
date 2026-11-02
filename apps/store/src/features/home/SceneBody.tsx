import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { ProductSummary } from '@galpon/api-client'
import type { HomeData } from './home-data'
import type { HomeStoryScene } from './story-stops'
import { Magnetic } from '../../components/motion'
import { Button } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { lineHref } from './home-data'
import { HOME_ARROW_SIZE, HOME_PILL_BUTTON, HOME_SCENE_TEXT } from './home-styles'
import { HOME_COPY } from './home.copy'
import { SceneReveal } from './SceneReveal'
import { StoryProductRow } from './StoryProductRow'
import { StoryTitle } from './StoryScene'

/** Lo que necesita la historia del inicio de los datos de la página (con la portada, que en escritorio es su primera parada). */
export type StoryData = Pick<HomeData, 'content' | 'story' | 'lines' | 'kitDiscountLabel'>

/** Fondo de la escena o parada donde va el contenido. */
type Tone = 'dark' | 'light'

/** Props de {@link SceneText}. */
interface SceneTextProps {
  /** El texto de la escena. */
  children: string
  /** Fondo de la escena. */
  tone: Tone
}

/** Párrafo de una escena: aparece subiendo con un retardo de 200 ms. */
function SceneText({ children, tone }: SceneTextProps): ReactNode {
  return (
    <SceneReveal
      kind="up"
      as="p"
      delay={200}
      className={cx(
        HOME_SCENE_TEXT,
        'text-pretty',
        tone === 'dark' ? 'text-neutral-300' : 'text-background/72',
      )}
    >
      {children}
    </SceneReveal>
  )
}

/** Props de {@link SceneProducts}. */
interface SceneProductsProps {
  /** Los productos de la escena. */
  products: readonly ProductSummary[]
  /** Fondo de la escena. */
  tone: Tone
}

/** Lista de productos de una escena, con el botón de agregar de cada uno. */
function SceneProducts({ products, tone }: SceneProductsProps): ReactNode {
  if (products.length === 0) return null
  return (
    <SceneReveal kind="up" delay={280}>
      <ul aria-label={HOME_COPY.storyProducts} className="m-0 flex list-none flex-col p-0">
        {products.map((product) => (
          <StoryProductRow key={product.id} product={product} tone={tone} />
        ))}
      </ul>
    </SceneReveal>
  )
}

/** Props de {@link SceneLink}. */
interface SceneLinkProps {
  /** Ruta de destino. */
  href: string
  /** Texto del botón. */
  children: string
  /** Fondo de la escena: en el oscuro va cobre con halo; en el claro, con borde oscuro. */
  tone: Tone
}

/** Botón de una escena: píldora con flecha que se corre hacia el mouse. */
function SceneLink({ href, children, tone }: SceneLinkProps): ReactNode {
  return (
    <Magnetic>
      <Button
        asChild
        variant={tone === 'dark' ? 'primary' : 'secondary'}
        size="lg"
        className={
          tone === 'dark' ? HOME_PILL_BUTTON : 'border-background! text-background! rounded-full!'
        }
      >
        <Link href={asRoute(href)}>
          {children}
          <ArrowRightIcon size={HOME_ARROW_SIZE} aria-hidden="true" />
        </Link>
      </Button>
    </Magnetic>
  )
}

/** Props de {@link SceneBody}. */
export interface SceneBodyProps {
  /** La escena del contenido editable: la de la bombilla o la del ritual. */
  scene: HomeStoryScene
  /** Fondo de la escena o parada: define los colores del texto y de los botones. */
  tone: Tone
  /** Los datos de la historia. */
  data: StoryData
}

/**
 * El contenido de una escena de la historia (título, texto, productos o pasos del ritual sin número,
 * y botón; sin rótulo chico: Ruling MR-23), igual en las escenas apiladas y en las paradas del mate
 * 3D.
 *
 * @param props - Ver {@link SceneBodyProps}.
 */
export function SceneBody({ scene, tone, data }: SceneBodyProps): ReactNode {
  const { content, story, lines } = data
  const title = <StoryTitle lines={scene.titleLines} tone={tone} />
  const text = <SceneText tone={tone}>{scene.text}</SceneText>
  const cta = (href: string): ReactNode =>
    scene.ctaLabel === null ? null : (
      <SceneLink href={href} tone={tone}>
        {scene.ctaLabel}
      </SceneLink>
    )
  switch (scene.key) {
    case 'bombilla':
      return (
        <>
          {title}
          {text}
          <SceneProducts products={story.bombillas} tone={tone} />
          {cta(lineHref(lines, scene.key))}
        </>
      )
    case 'ritual':
      return (
        <>
          {title}
          {text}
          <SceneReveal kind="up" delay={280}>
            <ol className="m-0 grid list-none grid-cols-4 gap-[10px] p-0 text-[12px] text-neutral-400">
              {content.ritualSteps.map((step, position) => (
                <li key={`${String(position)}-${step}`}>{step}</li>
              ))}
            </ol>
          </SceneReveal>
          {cta('/tienda')}
        </>
      )
  }
}
