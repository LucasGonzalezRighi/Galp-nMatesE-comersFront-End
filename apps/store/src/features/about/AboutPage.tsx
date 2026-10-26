import type { ReactNode } from 'react'
import { ImageIcon } from '@phosphor-icons/react/dist/ssr/Image'
import Link from 'next/link'
import type { AboutContent } from '@galpon/api-client'
import { Magnetic, MouseParallax, Reveal, ScrubText, Tilt } from '@/components/motion'
import { Button, ImageWithPlaceholder } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { ABOUT_COPY } from './about.copy'

/** Props de {@link AboutPage}. */
export interface AboutPageProps {
  /** Textos editables de la página. */
  content: AboutContent
}

/** Rótulo de sección: una línea cobre y el texto en mayúsculas ("Sobre nosotros"). */
const EYEBROW =
  'text-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:bg-accent before:content-[""]'

/** Contenedor de cada sección: 1280 px de ancho máximo y el margen lateral del diseño. */
const CONTAINER = 'mx-auto max-w-[1280px] px-[clamp(20px,5vw,64px)]'

/** Línea fina que se desvanece en los extremos, arriba de cada paso. */
const STEP_DIVIDER =
  'bg-[linear-gradient(to_right,transparent,var(--color-neutral-700)_48px,var(--color-neutral-700)_calc(100%-48px),transparent)] bg-[length:100%_1px] bg-top bg-no-repeat'

/** Resplandor cobrizo del fondo de la portada, que sigue al mouse en sentido contrario. */
const HERO_GLOW =
  'pointer-events-none absolute -top-[300px] -right-[200px] size-[800px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-700)_45%,transparent),transparent_62%)]'

/** Número de un paso con dos dígitos ("01"). */
function stepNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

/**
 * Página Nosotros (spec 9.5): portada de tres líneas con el fondo que sigue al mouse, los socios,
 * la frase que se ilumina con el scroll, "Cómo trabajamos" en pasos y el botón a la tienda. Todos
 * los textos salen del contenido editable.
 *
 * @param props - Ver {@link AboutPageProps}.
 */
export function AboutPage({ content }: AboutPageProps): ReactNode {
  const { hero, partners, quote, steps, stepsEyebrow, ctaLabel } = content
  const lastLine = hero.titleLines.length - 1
  return (
    <main>
      <section className="relative overflow-hidden pt-[clamp(56px,8vw,120px)] pb-[clamp(40px,6vw,80px)]">
        <MouseParallax strength={-30} className={HERO_GLOW} />
        <div className={`${CONTAINER} relative flex flex-col gap-[22px]`}>
          <span className={EYEBROW}>{hero.eyebrow}</span>
          <h1 className="text-[clamp(46px,7vw,100px)] leading-[0.98] tracking-[-0.035em]">
            {hero.titleLines.map((line, index) => (
              <Reveal
                key={`${String(index)}-${line}`}
                kind="rise"
                as="span"
                delay={index * 120}
                contentClassName={index === lastLine ? 'text-accent-300' : undefined}
              >
                {line}
              </Reveal>
            ))}
          </h1>
          <Reveal
            as="p"
            delay={380}
            className="max-w-[54ch] text-[17px] leading-[1.65] text-neutral-300"
          >
            {hero.text}
          </Reveal>
        </div>
      </section>

      {partners.length === 0 ? null : (
        <section className={`${CONTAINER} pb-[clamp(72px,9vw,120px)]`}>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6 p-0">
            {partners.map((partner, index) => (
              <Reveal
                as="li"
                key={`${String(index)}-${partner.name}`}
                delay={index * 120}
                className="flex flex-col gap-[14px]"
              >
                <Tilt className="bg-surface relative aspect-[4/5] overflow-hidden rounded-lg shadow-sm">
                  {partner.photo === null ? (
                    <div className="flex size-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-700 text-[11px] text-neutral-500">
                      <ImageIcon size={22} aria-hidden="true" />
                      {ABOUT_COPY.photoPlaceholder(partner.name)}
                    </div>
                  ) : (
                    <ImageWithPlaceholder
                      src={partner.photo.url}
                      alt={
                        partner.photo.alt === ''
                          ? ABOUT_COPY.photoAlt(partner.name)
                          : partner.photo.alt
                      }
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="size-full"
                    />
                  )}
                </Tilt>
                <div className="flex flex-col gap-1">
                  <span className="text-[22px] tracking-[-0.015em]">{partner.name}</span>
                  <span className="text-accent-300 text-[13px]">{partner.role}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <section className="py-[clamp(60px,9vw,140px)]">
        <div className={CONTAINER}>
          <ScrubText
            text={quote}
            className="max-w-[22ch] text-[clamp(30px,4.4vw,60px)] leading-[1.12] font-medium tracking-[-0.028em]"
          />
        </div>
      </section>

      <section className={`${CONTAINER} pb-[clamp(80px,10vw,140px)]`}>
        <span className={`${EYEBROW} mb-6`}>{stepsEyebrow}</span>
        <ol className="m-0 list-none p-0">
          {steps.map((step, index) => (
            <Reveal
              as="li"
              key={`${String(index)}-${step.title}`}
              className={`${STEP_DIVIDER} grid grid-cols-[48px_minmax(0,1fr)] items-baseline gap-x-5 gap-y-3 py-8 sm:grid-cols-[minmax(48px,120px)_minmax(0,360px)_minmax(0,1fr)] sm:gap-x-[clamp(20px,4vw,64px)]`}
            >
              <span className="text-accent tabular-nums">{stepNumber(index)}</span>
              <h3 className="text-[24px] tracking-[-0.01em]">{step.title}</h3>
              <p className="col-span-2 text-[15.5px] leading-[1.7] text-neutral-300 sm:col-span-1">
                {step.text}
              </p>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10">
          <Magnetic strength={0.3}>
            <Button asChild size="lg">
              <Link href={asRoute('/tienda')}>{ctaLabel}</Link>
            </Button>
          </Magnetic>
        </div>
      </section>
    </main>
  )
}
