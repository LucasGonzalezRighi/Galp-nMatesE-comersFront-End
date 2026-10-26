import type { ReactNode } from 'react'
import type { LegalContent } from '@galpon/api-client'
import { Reveal } from '@/components/motion'
import { formatUpdatedAt, splitParagraphs } from './legal-text'
import { LEGAL_COPY } from './legal.copy'

/** Props de {@link LegalPage}. */
export interface LegalPageProps {
  /** Documento a mostrar (títulos, texto y fecha de actualización). */
  content: LegalContent
}

/**
 * Página de un documento legal (términos y condiciones o política de privacidad): título, fecha
 * de la última actualización y el texto en párrafos.
 *
 * @param props - Ver {@link LegalPageProps}.
 * @throws {RangeError} Si `content.updatedAt` no es un día `aaaa-mm-dd`.
 */
export function LegalPage({ content }: LegalPageProps): ReactNode {
  const paragraphs = splitParagraphs(content.body)
  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-[22px] px-[clamp(20px,5vw,64px)] pt-[clamp(48px,7vw,96px)] pb-[clamp(72px,9vw,120px)]">
      <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
        {LEGAL_COPY.eyebrow}
      </span>
      <h1 className="text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.03em]">
        <Reveal kind="rise" as="span">
          {content.title}
        </Reveal>
      </h1>
      <p className="m-0 text-[13px] text-neutral-500">
        {LEGAL_COPY.updatedAt(formatUpdatedAt(content.updatedAt))}
      </p>
      <div className="flex flex-col gap-4">
        {paragraphs.map((paragraph, index) => (
          <p
            key={`${String(index)}-${paragraph.slice(0, 24)}`}
            className="m-0 text-[15.5px] leading-[1.75] whitespace-pre-line text-neutral-300"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </main>
  )
}
