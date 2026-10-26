import type { ReactNode } from 'react'
import type { FaqContent } from '@galpon/api-client'
import { Reveal } from '@/components/motion'
import { FAQ_COPY } from './faq.copy'
import { FaqBrowser } from './FaqBrowser'

/** Props de {@link FaqPage}. */
export interface FaqPageProps {
  /** Categorías de preguntas, en el orden en que se muestran. */
  content: FaqContent
}

/**
 * Página de preguntas frecuentes (spec 9.5): título y, debajo, las categorías con el acordeón
 * ({@link FaqBrowser}).
 *
 * @param props - Ver {@link FaqPageProps}.
 */
export function FaqPage({ content }: FaqPageProps): ReactNode {
  return (
    <main>
      <section className="mx-auto flex max-w-[1280px] flex-col gap-[18px] px-[clamp(20px,5vw,64px)] pt-[clamp(48px,7vw,96px)] pb-8">
        <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
          {FAQ_COPY.eyebrow}
        </span>
        <h1 className="text-[clamp(42px,6vw,84px)] leading-none tracking-[-0.035em]">
          <Reveal kind="rise" as="span">
            {FAQ_COPY.title}
          </Reveal>
        </h1>
      </section>
      <FaqBrowser categories={content.categories} />
    </main>
  )
}
