import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { HomeData } from './home-data'
import { ScrubText } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { Eyebrow } from './Eyebrow'
import { HOME_CONTAINER } from './home-styles'

/** Props de {@link HomeManifesto}. */
export interface HomeManifestoProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Manifiesto (spec 9.5): una frase grande que se ilumina palabra por palabra con el scroll
 * (`ScrubText`) y el link "Conocé la historia del galpón" a Nosotros. El texto es editable, así
 * que las palabras resaltadas en cobre del diseño no se replican (no se sabe cuáles serían).
 *
 * @param props - Ver {@link HomeManifestoProps}.
 */
export function HomeManifesto({ data }: HomeManifestoProps): ReactNode {
  const { manifesto } = data.content
  return (
    <section className="py-[clamp(80px,12vw,180px)]">
      <div className={`${HOME_CONTAINER} flex flex-col gap-9`}>
        <Eyebrow>{manifesto.eyebrow}</Eyebrow>
        <ScrubText
          text={manifesto.text}
          className="m-0 max-w-[23ch] text-[clamp(30px,4.6vw,64px)] leading-[1.12] font-medium tracking-[-0.028em]"
        />
        <Button asChild variant="ghost" className="self-start">
          <Link href={asRoute('/nosotros')}>
            {manifesto.ctaLabel}
            <ArrowRightIcon size={14} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
