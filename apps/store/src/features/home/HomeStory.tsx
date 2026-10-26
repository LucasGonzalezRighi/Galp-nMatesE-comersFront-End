import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { HomeContent, ProductSummary } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { CountUp, Magnetic, Reveal } from '../../components/motion'
import { Button } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { Eyebrow } from './Eyebrow'
import { lineHref } from './home-data'
import { HOME_ARROW_SIZE, HOME_PILL_BUTTON, HOME_SCENE_TEXT } from './home-styles'
import { HOME_COPY, orderLabel } from './home.copy'
import { LeatherPicker } from './LeatherPicker'
import { StoryProductRow } from './StoryProductRow'
import { StoryScene, StoryTitle } from './StoryScene'
import { StoryVisual } from './StoryVisual'

/** Una escena del contenido editable (las seis que siguen a la portada). */
type Scene = HomeContent['scenes'][number]

/** Busca la escena por su clave; si el contenido no la trae, esa escena no se dibuja. */
function sceneOf(scenes: HomeContent['scenes'], key: Scene['key']): Scene | undefined {
  return scenes.find((scene) => scene.key === key)
}

/** Props de {@link SceneText}. */
interface SceneTextProps {
  /** El texto de la escena. */
  children: string
  /** Fondo de la escena. */
  tone: 'dark' | 'light'
}

/** Párrafo de una escena: aparece subiendo con un retardo de 200 ms. */
function SceneText({ children, tone }: SceneTextProps): ReactNode {
  return (
    <Reveal
      kind="up"
      as="p"
      delay={200}
      className={cx(HOME_SCENE_TEXT, tone === 'dark' ? 'text-neutral-300' : 'text-background/72')}
    >
      {children}
    </Reveal>
  )
}

/** Props de {@link SceneProducts}. */
interface SceneProductsProps {
  /** Los productos de la escena. */
  products: readonly ProductSummary[]
  /** Fondo de la escena. */
  tone: 'dark' | 'light'
}

/** Lista de productos de una escena, con el botón de agregar de cada uno. */
function SceneProducts({ products, tone }: SceneProductsProps): ReactNode {
  if (products.length === 0) return null
  return (
    <Reveal kind="up" delay={280}>
      <ul aria-label={HOME_COPY.storyProducts} className="m-0 flex list-none flex-col p-0">
        {products.map((product) => (
          <StoryProductRow key={product.id} product={product} tone={tone} />
        ))}
      </ul>
    </Reveal>
  )
}

/** Props de {@link SceneLink}. */
interface SceneLinkProps {
  /** Ruta de destino. */
  href: string
  /** Texto del botón. */
  children: string
  /** `primary` (cobre, con halo) o `outline` (borde oscuro, para el fondo claro). */
  look?: 'primary' | 'outline'
}

/** Botón de una escena: píldora con flecha que se corre hacia el mouse. */
function SceneLink({ href, children, look = 'primary' }: SceneLinkProps): ReactNode {
  return (
    <Magnetic>
      <Button
        asChild
        variant={look === 'primary' ? 'primary' : 'secondary'}
        size="lg"
        className={
          look === 'primary'
            ? HOME_PILL_BUTTON
            : 'border-background! text-background! rounded-full!'
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

/** Props de {@link StatFigure}. */
interface StatFigureProps {
  /** La cifra. */
  value: number
  /** Qué cuenta. */
  label: string
}

/** Una cifra animada con su rótulo, de la escena de la calabaza. */
function StatFigure({ value, label }: StatFigureProps): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[30px] tracking-[-0.03em] tabular-nums">
        <CountUp value={value} />
      </span>
      <span className="text-[12px] text-neutral-400">{label}</span>
    </div>
  )
}

/** Props de {@link HomeStory}. */
export interface HomeStoryProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Historia de seis escenas que sigue a la portada (spec 9.5): "Tres piezas. Una ronda.",
 * calabaza y virola con tres cifras, el bombillón, la yerba, el ritual del agua y el cuero.
 * Los textos salen de `HomeContent.scenes`; los productos de las escenas del bombillón y la
 * yerba, y de la primera, de `HomeContent.storyProducts` (con respaldo si alguno no se puede
 * comprar). Una escena que el contenido no trae no se dibuja.
 *
 * @param props - Ver {@link HomeStoryProps}.
 */
export function HomeStory({ data }: HomeStoryProps): ReactNode {
  const { content, story, stats, lines } = data
  const pieces = sceneOf(content.scenes, 'pieces')
  const gourd = sceneOf(content.scenes, 'gourd')
  const bombilla = sceneOf(content.scenes, 'bombilla')
  const yerba = sceneOf(content.scenes, 'yerba')
  const ritual = sceneOf(content.scenes, 'ritual')
  const leather = sceneOf(content.scenes, 'leather')
  const firstBombilla = story.bombillas[0] ?? null
  const firstYerba = story.yerbas[0] ?? null
  const piecesProducts = [story.hero, firstBombilla, firstYerba].filter(
    (product): product is ProductSummary => product !== null,
  )
  return (
    <>
      {pieces === undefined ? null : (
        <StoryScene
          tone="light"
          side="start"
          visual={<StoryVisual product={story.hero} side="right" />}
        >
          <Eyebrow tone="sceneLight">{pieces.eyebrow}</Eyebrow>
          <StoryTitle lines={pieces.titleLines} tone="light" />
          <SceneText tone="light">{pieces.text}</SceneText>
          <SceneProducts products={piecesProducts} tone="light" />
          {pieces.ctaLabel === null ? null : (
            <SceneLink href="/kit" look="outline">
              {pieces.ctaLabel}
            </SceneLink>
          )}
        </StoryScene>
      )}
      {gourd === undefined ? null : (
        <StoryScene
          tone="dark"
          side="end"
          background="gourd"
          visual={<StoryVisual product={story.hero} side="left" floatDelay={600} />}
        >
          <StoryTitle lines={gourd.titleLines} tone="dark" size="md" />
          <SceneText tone="dark">{gourd.text}</SceneText>
          <Reveal kind="up" delay={280} className="grid grid-cols-3 gap-4">
            <StatFigure value={stats.mateModels} label={HOME_COPY.modelsOfMate} />
            <StatFigure value={stats.mateLines} label={HOME_COPY.mateLines} />
            <StatFigure value={stats.leathers} label={HOME_COPY.leathersToChoose} />
          </Reveal>
          {gourd.ctaLabel === null ? null : <SceneLink href="/tienda">{gourd.ctaLabel}</SceneLink>}
        </StoryScene>
      )}
      {bombilla === undefined ? null : (
        <StoryScene
          tone="dark"
          side="end"
          background="bombilla"
          ghostWord={HOME_COPY.ghostWord}
          visual={<StoryVisual product={firstBombilla} side="left" floatDelay={1200} />}
        >
          <Eyebrow tone="sceneDark">{bombilla.eyebrow}</Eyebrow>
          <StoryTitle lines={bombilla.titleLines} tone="dark" />
          <SceneText tone="dark">{bombilla.text}</SceneText>
          <SceneProducts products={story.bombillas} tone="dark" />
          {bombilla.ctaLabel === null ? null : (
            <SceneLink href={lineHref(lines, 'bombilla')}>{bombilla.ctaLabel}</SceneLink>
          )}
        </StoryScene>
      )}
      {yerba === undefined ? null : (
        <StoryScene
          tone="light"
          side="start"
          visual={<StoryVisual product={firstYerba} side="right" floatDelay={300} />}
        >
          <Eyebrow tone="sceneLight">{yerba.eyebrow}</Eyebrow>
          <StoryTitle lines={yerba.titleLines} tone="light" />
          <SceneText tone="light">{yerba.text}</SceneText>
          <SceneProducts products={story.yerbas} tone="light" />
          {yerba.ctaLabel === null ? null : (
            <SceneLink href={lineHref(lines, 'yerba')} look="outline">
              {yerba.ctaLabel}
            </SceneLink>
          )}
        </StoryScene>
      )}
      {ritual === undefined ? null : (
        <StoryScene
          tone="dark"
          side="start"
          background="hero"
          visual={<StoryVisual product={story.hero} side="right" floatDelay={900} />}
        >
          <Eyebrow tone="sceneDark">{ritual.eyebrow}</Eyebrow>
          <StoryTitle lines={ritual.titleLines} tone="dark" />
          <SceneText tone="dark">{ritual.text}</SceneText>
          <Reveal kind="up" delay={280}>
            <ol className="m-0 grid list-none grid-cols-4 gap-[10px] p-0 text-[12px] text-neutral-400">
              {content.ritualSteps.map((step, position) => (
                <li key={`${String(position)}-${step}`} className="flex flex-col gap-[6px]">
                  <span className="text-accent-2-300">{orderLabel(position + 1)}</span>
                  {step}
                </li>
              ))}
            </ol>
          </Reveal>
          {ritual.ctaLabel === null ? null : (
            <SceneLink href="/tienda">{ritual.ctaLabel}</SceneLink>
          )}
        </StoryScene>
      )}
      {leather === undefined ? null : (
        <StoryScene
          tone="light"
          side="start"
          visual={<StoryVisual product={story.hero} side="right" floatDelay={1500} />}
        >
          <Eyebrow tone="sceneLight">{leather.eyebrow}</Eyebrow>
          <StoryTitle lines={leather.titleLines} tone="light" />
          <SceneText tone="light">{leather.text}</SceneText>
          <Reveal kind="up" delay={260}>
            <LeatherPicker />
          </Reveal>
          <Reveal kind="up" delay={340} className="flex flex-wrap gap-[14px]">
            {leather.ctaLabel === null ? null : (
              <SceneLink href="/kit" look="outline">
                {leather.ctaLabel}
              </SceneLink>
            )}
            <SceneLink href="/tienda" look="outline">
              {HOME_COPY.allMates}
            </SceneLink>
          </Reveal>
        </StoryScene>
      )}
    </>
  )
}
