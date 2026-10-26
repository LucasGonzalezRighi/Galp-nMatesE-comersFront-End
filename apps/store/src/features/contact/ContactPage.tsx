import type { ReactNode } from 'react'
import Link from 'next/link'
import type { PublicSettings } from '@galpon/api-client'
import { Magnetic, Reveal } from '@/components/motion'
import { asRoute } from '@/lib/routes'
import { CONTACT_COPY } from './contact.copy'
import { ContactPanel } from './ContactPanel'
import { CopyEmailButton } from './CopyEmailButton'

/** Props de {@link ContactPage}. */
export interface ContactPageProps {
  /** Ajustes públicos de la tienda: el email de contacto y los datos de atención del vendedor. */
  settings: Pick<PublicSettings, 'contactEmail' | 'seller'>
}

/** Un dato de atención: su rótulo y su valor. */
interface SupportLine {
  label: string
  value: string
}

/** Los datos de atención que el vendedor cargó (canal alternativo, área y horario), en ese orden. */
function supportLines(seller: PublicSettings['seller']): SupportLine[] {
  const lines: SupportLine[] = []
  if (seller.phone !== null)
    lines.push({ label: CONTACT_COPY.alternativeChannel, value: seller.phone })
  if (seller.supportArea !== null) {
    lines.push({ label: CONTACT_COPY.supportArea, value: seller.supportArea })
  }
  if (seller.supportHours !== null) {
    lines.push({ label: CONTACT_COPY.supportHours, value: seller.supportHours })
  }
  return lines
}

/**
 * Página de Contacto (spec 9.5): "Escribinos.", el email con "Copiar", los accesos a las preguntas
 * frecuentes, el canal alternativo, el área y el horario de atención (cuando están cargados), y
 * el formulario. Elegir el motivo "Arrepentimiento" cambia al formulario del botón de
 * arrepentimiento.
 *
 * @param props - Ver {@link ContactPageProps}.
 */
export function ContactPage({ settings }: ContactPageProps): ReactNode {
  const support = supportLines(settings.seller)
  return (
    <main className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-x-[72px] gap-y-12 px-[clamp(20px,5vw,64px)] pt-[clamp(48px,7vw,96px)] pb-[clamp(72px,9vw,120px)]">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-[22px]">
        <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
          {CONTACT_COPY.eyebrow}
        </span>
        <h1 className="text-[clamp(46px,7vw,100px)] leading-[0.98] tracking-[-0.035em]">
          <Reveal kind="rise" as="span">
            {CONTACT_COPY.title}
          </Reveal>
        </h1>
        <Reveal
          as="p"
          delay={120}
          className="max-w-[44ch] text-[16px] leading-[1.65] text-neutral-300"
        >
          {CONTACT_COPY.intro}
        </Reveal>
        <Reveal delay={220} className="flex flex-wrap items-center gap-3">
          <Magnetic strength={0.25} reach={10}>
            <a
              href={`mailto:${settings.contactEmail}`}
              className="bg-[linear-gradient(var(--color-accent),var(--color-accent))] bg-[length:100%_1px] bg-left-bottom bg-no-repeat pb-1 text-[clamp(20px,2.4vw,28px)] tracking-[-0.015em] no-underline"
            >
              {settings.contactEmail}
            </a>
          </Magnetic>
          <CopyEmailButton email={settings.contactEmail} />
        </Reveal>
        <Reveal delay={320} className="mt-3 flex flex-col gap-2 text-[14px]">
          <span className="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">
            {CONTACT_COPY.beforeWriting}
          </span>
          {CONTACT_COPY.shortcuts.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={asRoute(shortcut.href)}
              className="text-accent-300 hover:text-accent-200 self-start no-underline"
            >
              {shortcut.label}
            </Link>
          ))}
        </Reveal>
        {support.length === 0 ? null : (
          <Reveal delay={420}>
            <dl className="m-0 flex flex-col gap-3 text-[14px]">
              {support.map((line) => (
                <div key={line.label} className="flex flex-col gap-[2px]">
                  <dt className="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">
                    {line.label}
                  </dt>
                  <dd className="m-0 text-neutral-300">{line.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        )}
      </div>
      <Reveal delay={200} className="min-w-0 flex-[1_1_420px]">
        <ContactPanel />
      </Reveal>
    </main>
  )
}
