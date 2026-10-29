import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { HomeData } from './home-data'
import { Reveal, ScrubText } from '../../components/motion'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { Eyebrow } from './Eyebrow'
import { HOME_CONTAINER } from './home-styles'
import { ManifestoBackdrop } from './ManifestoBackdrop'

/** Props de {@link HomeManifesto}. */
export interface HomeManifestoProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Manifiesto (spec 9.5): una frase grande que se ilumina palabra por palabra con el scroll
 * (`ScrubText`) y el link "Conocé la historia del galpón" a Nosotros. El texto es editable, así
 * que las palabras resaltadas en cobre del diseño no se replican (no se sabe cuáles serían).
 * De fondo, la foto del yerbal con su velo ({@link ManifestoBackdrop}), que entra con un zoom lento
 * y hace parallax; el texto va por encima, con un halo del color de fondo (`text-shadow`, como en
 * las paradas del mate) y el rótulo y el link en cobre claro (`accent-300`), para que los tres se
 * lean a 4,5:1 o más sobre los brillos de la foto.
 *
 * @param props - Ver {@link HomeManifestoProps}.
 */
export function HomeManifesto({ data }: HomeManifestoProps): ReactNode {
  const { manifesto } = data.content
  return (
    <section className="home-manifesto relative flex items-center overflow-hidden py-[clamp(80px,12vw,180px)]">
      <ManifestoBackdrop />
      <div
        className={`${HOME_CONTAINER} relative z-10 flex flex-col gap-9 [text-shadow:0_1px_2px_var(--color-background),0_0_24px_var(--color-background)]`}
      >
        <Reveal kind="up">
          <Eyebrow tone="photo">{manifesto.eyebrow}</Eyebrow>
        </Reveal>
        <ScrubText
          text={manifesto.text}
          className="m-0 max-w-[23ch] text-[clamp(30px,4.6vw,64px)] leading-[1.12] font-medium tracking-[-0.028em]"
        />
        <Button asChild variant="ghost" className="home-manifesto-cta self-start">
          <Link href={asRoute('/nosotros')}>
            {manifesto.ctaLabel}
            <ArrowRightIcon size={14} aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
