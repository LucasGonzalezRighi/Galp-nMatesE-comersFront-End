import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Link from 'next/link'
import type { HomeData } from './home-data'
import { Button } from '../../components/ui'
import { asRoute } from '../../lib/routes'
import { HOME_CONTAINER } from './home-styles'
import { ManifestoEnter } from './ManifestoEnter'
import { ManifestoPhrase } from './ManifestoPhrase'

/** Props de {@link HomeManifesto}. */
export interface HomeManifestoProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Manifiesto (spec 9.5): una frase grande que se ilumina palabra por palabra con el scroll
 * ({@link ManifestoPhrase}) y el link "Conocé la historia del galpón" a Nosotros. El texto es editable, así
 * que las palabras resaltadas en cobre del diseño no se replican (no se sabe cuáles serían).
 * La foto del yerbal de fondo (`ManifestoBackdrop`, que entra con zoom, se enciende y hace
 * parallax) la pone `PinnedManifesto`, porque cubre también la banda de cifras; el texto va por
 * encima y en escritorio sube y aparece con el scroll ({@link ManifestoEnter}), con un halo del
 * color de fondo (`text-shadow`, como en las paradas del mate) y el link en cobre claro
 * (`accent-300`), para que se lean a 4,5:1 o más sobre los brillos de la foto. Sin rótulo chico
 * (Ruling MR-23): la frase en cuatro renglones a 1440 y a 1905 px (`max-w-[30ch]`, sin achicar la
 * letra) y el link a la derecha, contra el borde del contenedor y a la altura del último renglón
 * (desde 1280 px, frase y link en la misma celda de una grilla).
 *
 * @param props - Ver {@link HomeManifestoProps}.
 */
export function HomeManifesto({ data }: HomeManifestoProps): ReactNode {
  const { manifesto } = data.content
  return (
    <section className="home-manifesto relative flex items-center overflow-hidden py-[clamp(80px,12vw,180px)]">
      <ManifestoEnter
        className={`${HOME_CONTAINER} relative z-10 flex flex-col gap-9 [text-shadow:0_1px_2px_var(--color-background),0_0_24px_var(--color-background)]`}
      >
        {/*
         * La frase a la izquierda y el link a la derecha, a la altura del último renglón. Desde 1280 px
         * comparten la misma celda de una grilla (el link abajo a la derecha, sobre el hueco que deja
         * el último renglón): con `flex-wrap` el link caía a una fila de abajo, a la izquierda. Más
         * angosto, la frase ocupa casi todo el ancho y el link seguiría pisándola, así que ahí vuelve
         * a envolver.
         */}
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-9 xl:grid xl:grid-cols-1">
          <ManifestoPhrase
            text={manifesto.text}
            className="home-manifesto-phrase m-0 max-w-[30ch] text-[clamp(30px,4.6vw,64px)] leading-[1.12] font-medium tracking-[-0.028em] xl:col-start-1 xl:row-start-1"
          />
          <Button
            asChild
            variant="ghost"
            className="home-manifesto-cta xl:col-start-1 xl:row-start-1 xl:self-end xl:justify-self-end"
          >
            <Link href={asRoute('/nosotros')}>
              {manifesto.ctaLabel}
              <ArrowRightIcon size={14} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </ManifestoEnter>
    </section>
  )
}
