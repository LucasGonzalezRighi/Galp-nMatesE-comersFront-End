import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Image from 'next/image'
import Link from 'next/link'
import type { HomeData } from './home-data'
import { Magnetic, Reveal } from '../../components/motion'
import { Button, Tag } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { HOME_ARROW_SIZE, HOME_CONTAINER, HOME_PILL_BUTTON } from './home-styles'
import { HOME_COPY } from './home.copy'
import { StoryVisual } from './StoryVisual'

/** Retardo de entrada de cada línea del título, en milisegundos (los 60 y 180 del diseño). */
const TITLE_LINE_DELAYS_MS = [60, 180] as const

/** Props de {@link HomeHero}. */
export interface HomeHeroProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Portada del inicio (escena 0, spec 9.5): píldora con la marca, título "Encontrá tu mate.",
 * bajada y los botones "Ver la tienda" y "Armá tu kit" (con el descuento del kit). A un costado,
 * la foto del mate de `HomeContent.storyProducts.hero` flotando: el mate 3D del diseño llega en P5.
 *
 * El título y la foto, que es lo primero que se ve, no esperan a JavaScript: el título entra con
 * CSS y la foto se dibuja en el HTML y carga con prioridad. El resto aparece con `Reveal`.
 *
 * @param props - Ver {@link HomeHeroProps}.
 */
export function HomeHero({ data }: HomeHeroProps): ReactNode {
  const { hero } = data.content
  return (
    <section className="home-hero relative flex items-center overflow-hidden">
      <div aria-hidden="true" className="home-bg-hero pointer-events-none absolute inset-0" />
      <StoryVisual product={data.story.hero} side="right" hero onMobile />
      <div
        className={`${HOME_CONTAINER} relative flex justify-start pt-[72px] pb-[calc(clamp(24px,6vh,64px)+120px)]`}
      >
        <div className="flex w-[min(100%,700px)] flex-col gap-6">
          <Reveal
            kind="up"
            className="bg-background/55 inline-flex items-center gap-[10px] self-start rounded-full py-[6px] pr-4 pl-2 text-[13px] shadow-[inset_0_0_0_1px_var(--color-neutral-700)]"
          >
            <span className="bg-accent-800 grid size-[26px] place-items-center rounded-full">
              <Image
                src="/brand/galpon-mark.png"
                alt=""
                width={13}
                height={17}
                className="h-auto w-[13px]"
              />
            </span>
            <span className="text-foreground">{HOME_COPY.brand}</span>
            <span aria-hidden="true" className="bg-accent-2-400 size-1 rounded-full" />
            <span className="text-neutral-400">{hero.eyebrow}</span>
          </Reveal>
          <h1 className="text-[clamp(54px,7.4vw,118px)] leading-[0.9] tracking-[-0.05em] whitespace-nowrap">
            {hero.titleLines.map((line, position) => (
              <span
                key={`${String(position)}-${line}`}
                className="block overflow-hidden pb-[0.1em]"
              >
                <span
                  className={
                    position === 0
                      ? 'home-rise block'
                      : 'home-rise from-accent-300 to-accent-2-300 block bg-linear-to-r bg-clip-text text-transparent'
                  }
                  style={{ animationDelay: `${String(TITLE_LINE_DELAYS_MS[position] ?? 180)}ms` }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>
          <Reveal
            kind="up"
            as="p"
            delay={200}
            className="max-w-[40ch] text-[clamp(16px,1.3vw,19px)] leading-[1.6] text-neutral-300"
          >
            {hero.text}
          </Reveal>
          <Reveal
            kind="up"
            delay={320}
            className="absolute inset-x-0 bottom-[clamp(24px,6vh,64px)] flex flex-wrap justify-center gap-[14px]"
          >
            <Magnetic>
              <Button
                asChild
                variant="primary"
                size="lg"
                className={`${HOME_PILL_BUTTON} home-cta-fill`}
              >
                <Link href={asRoute('/tienda')}>
                  {hero.primaryCtaLabel}
                  <ArrowRightIcon size={HOME_ARROW_SIZE} aria-hidden="true" />
                </Link>
              </Button>
            </Magnetic>
            <Magnetic>
              <Button asChild variant="secondary" size="lg" className="home-cta-fill rounded-full!">
                <Link href={asRoute('/kit')}>
                  {hero.secondaryCtaLabel}
                  {data.kitDiscountLabel === null ? null : (
                    <Tag variant="accent2">{data.kitDiscountLabel}</Tag>
                  )}
                </Link>
              </Button>
            </Magnetic>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
