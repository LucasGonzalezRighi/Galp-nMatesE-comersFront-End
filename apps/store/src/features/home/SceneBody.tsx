import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { ProductSummary } from '@galpon/api-client'
import type { HomeData } from './home-data'
import type { StoryScene } from './story-stops'
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
import { StoryTitle } from './StoryScene'

/** Lo que necesita la historia del inicio de los datos de la página. */
export type StoryData = Pick<HomeData, 'content' | 'story' | 'stats' | 'lines'>

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
    <Reveal
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
    </Reveal>
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

/** Props de {@link SceneBody}. */
export interface SceneBodyProps {
  /** La escena del contenido editable. */
  scene: StoryScene
  /** Fondo de la escena o parada: define los colores del texto y de los botones. */
  tone: Tone
  /** Los datos de la historia. */
  data: StoryData
  /** Avance de la parada del cuero en el paseo del mate (ver `LeatherPicker`); sin él, usa su scroll. */
  leatherProgress?: MotionValue<number>
}

/**
 * El contenido de una escena de la historia (rótulo, título, texto, productos, cifras, pasos del
 * ritual o cueros, y botón), igual en las escenas apiladas y en las paradas del paseo del mate.
 * Los productos de las tres piezas son el mate, el primer bombillón y la primera yerba.
 *
 * @param props - Ver {@link SceneBodyProps}.
 */
export function SceneBody({ scene, tone, data, leatherProgress }: SceneBodyProps): ReactNode {
  const { content, story, stats, lines } = data
  const eyebrow = (
    <Eyebrow tone={tone === 'dark' ? 'sceneDark' : 'sceneLight'}>{scene.eyebrow}</Eyebrow>
  )
  const title = <StoryTitle lines={scene.titleLines} tone={tone} />
  const text = <SceneText tone={tone}>{scene.text}</SceneText>
  const cta = (href: string): ReactNode =>
    scene.ctaLabel === null ? null : (
      <SceneLink href={href} tone={tone}>
        {scene.ctaLabel}
      </SceneLink>
    )
  switch (scene.key) {
    case 'pieces': {
      const products = [story.hero, story.bombillas[0] ?? null, story.yerbas[0] ?? null].filter(
        (product): product is ProductSummary => product !== null,
      )
      return (
        <>
          {eyebrow}
          {title}
          {text}
          <SceneProducts products={products} tone={tone} />
          {cta('/kit')}
        </>
      )
    }
    case 'gourd':
      return (
        <>
          <StoryTitle lines={scene.titleLines} tone={tone} size="md" />
          {text}
          <Reveal kind="up" delay={280} className="grid grid-cols-3 gap-4">
            <StatFigure value={stats.mateModels} label={HOME_COPY.modelsOfMate} />
            <StatFigure value={stats.mateLines} label={HOME_COPY.mateLines} />
            <StatFigure value={stats.leathers} label={HOME_COPY.leathersToChoose} />
          </Reveal>
          {cta('/tienda')}
        </>
      )
    case 'bombilla':
    case 'yerba':
      return (
        <>
          {eyebrow}
          {title}
          {text}
          <SceneProducts
            products={scene.key === 'bombilla' ? story.bombillas : story.yerbas}
            tone={tone}
          />
          {cta(lineHref(lines, scene.key))}
        </>
      )
    case 'ritual':
      return (
        <>
          {eyebrow}
          {title}
          {text}
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
          {cta('/tienda')}
        </>
      )
    case 'leather':
      return (
        <>
          {eyebrow}
          {title}
          {text}
          <Reveal kind="up" delay={260}>
            <LeatherPicker progress={leatherProgress} />
          </Reveal>
          <Reveal kind="up" delay={340} className="flex flex-wrap gap-[14px]">
            {cta('/kit')}
            <SceneLink href="/tienda" tone={tone}>
              {HOME_COPY.allMates}
            </SceneLink>
          </Reveal>
        </>
      )
  }
}
