import type { ReactNode } from 'react'
import Link from 'next/link'
import type { LegalContent } from '@galpon/api-client'
import type { LegalMarkerValues } from '@galpon/domain'
import { Reveal } from '@/components/motion'
import { asRoute } from '@/lib/routes'
import { resolveLegalMarkers } from '@galpon/domain'
import type { LegalBlock, LegalInline } from './legal-text'
import { formatUpdatedAt, parseLegalBody } from './legal-text'
import { LEGAL_COPY } from './legal.copy'
import { PrintButton } from './PrintButton'
import './legal.css'

/** Props de {@link LegalPage}. */
export interface LegalPageProps {
  /** Documento a mostrar (título, cuerpo con marcadores y fecha de actualización). */
  content: LegalContent
  /** Datos del vendedor con que se resuelven los marcadores `{{clave}}` (`legalMarkerValues`). */
  markers: LegalMarkerValues
  /** Lo que se lee en lugar de un dato que falta: "a completar por el vendedor" o `''` en producción (LA-2). */
  missingText: string
}

/** Estilo de los enlaces dentro del texto. */
const INLINE_LINK = 'text-accent-300 hover:text-accent-200 underline underline-offset-2'

/** Dibuja los tramos de un párrafo o de un ítem. */
function Inlines({ inlines }: { inlines: readonly LegalInline[] }): ReactNode {
  return inlines.map((inline, index) => {
    const key = `${String(index)}-${inline.text.slice(0, 16)}`
    if (inline.kind === 'text') return <span key={key}>{inline.text}</span>
    if (inline.href.startsWith('/')) {
      return (
        <Link key={key} href={asRoute(inline.href)} className={INLINE_LINK}>
          {inline.text}
        </Link>
      )
    }
    return (
      <a
        key={key}
        href={inline.href}
        target="_blank"
        rel="noopener noreferrer"
        data-legal-external=""
        className={INLINE_LINK}
      >
        {inline.text}
        <span className="sr-only"> {LEGAL_COPY.newTab}</span>
      </a>
    )
  })
}

/** Dibuja un bloque del documento. */
function Block({ block }: { block: LegalBlock }): ReactNode {
  if (block.kind === 'heading') {
    return (
      <h2
        id={block.id}
        className="mt-6 scroll-mt-[96px] text-[clamp(20px,2.4vw,26px)] leading-[1.2] tracking-[-0.01em]"
      >
        {block.text}
      </h2>
    )
  }
  if (block.kind === 'list') {
    return (
      <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15.5px] leading-[1.7] text-neutral-300 marker:text-neutral-500">
        {block.items.map((item, index) => (
          <li key={`${String(index)}-${item[0]?.text.slice(0, 16) ?? ''}`}>
            <Inlines inlines={item} />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p className="m-0 text-[15.5px] leading-[1.75] whitespace-pre-line text-neutral-300">
      <Inlines inlines={block.inlines} />
    </p>
  )
}

/**
 * Página de un documento legal (términos, privacidad, cookies o devoluciones): título, fecha de
 * la última actualización, el botón para imprimir o guardar como PDF y el texto con secciones
 * `h2`, listas y enlaces (LA-1). Los marcadores del vendedor se resuelven antes de interpretar el
 * texto: la página nunca muestra `{{` ni `}}` (LA-2). El `main` lleva `data-legal-page`, que
 * activa la hoja de impresión (`legal.css`).
 *
 * @param props - Ver {@link LegalPageProps}.
 * @throws {RangeError} Si `content.updatedAt` no es un día `aaaa-mm-dd`.
 */
export function LegalPage({ content, markers, missingText }: LegalPageProps): ReactNode {
  const blocks = parseLegalBody(resolveLegalMarkers(content.body, markers, missingText))
  return (
    <main
      data-legal-page=""
      className="mx-auto flex max-w-[860px] flex-col gap-[22px] px-(--site-gutter) pt-[clamp(48px,7vw,96px)] pb-[clamp(72px,9vw,120px)]"
    >
      <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
        {LEGAL_COPY.eyebrow}
      </span>
      <h1 className="text-[clamp(36px,5vw,64px)] leading-[1.05] tracking-[-0.03em]">
        <Reveal kind="rise" as="span">
          {content.title}
        </Reveal>
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="m-0 text-[13px] text-neutral-500">
          {LEGAL_COPY.updatedAt(formatUpdatedAt(content.updatedAt))}
        </p>
        <PrintButton />
      </div>
      <div className="flex flex-col gap-4">
        {blocks.map((block, index) => (
          <Block key={`${String(index)}-${block.kind}`} block={block} />
        ))}
      </div>
    </main>
  )
}
