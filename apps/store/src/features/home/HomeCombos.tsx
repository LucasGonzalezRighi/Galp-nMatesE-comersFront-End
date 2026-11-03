'use client'

import type { ReactNode } from 'react'
import { useId } from 'react'
import type { Combo, PublicSettings } from '@galpon/api-client'
import { Reveal, useMediaQuery } from '../../components/motion'
import { ArrowCarousel } from '../../components/ui'
import { ComboCard } from '../combo-card'
import { HOME_CONTAINER, HOME_SECTION_TITLE } from './home-styles'
import { HOME_COPY } from './home.copy'

/** Hasta cuántos combos van en una grilla desde 768 px; con más, carrusel. */
export const COMBOS_GRID_MAX = 3

/** Desde este ancho los combos pueden ir en grilla; más angosto, siempre carrusel. */
const WIDE_QUERY = '(min-width: 768px)'

/** Espacio de arriba de la sección: el mismo de los destacados (el de ellos la separa de abajo). */
const SECTION_TOP = 'pt-[clamp(80px,10vw,140px)]'

/**
 * Ancho de cada tarjeta en el carrusel, medido contra la sección (`@container`): en el celular la
 * siguiente asoma; desde 768 px entran dos y desde 1100 px tres, con el margen del sitio a los lados
 * y los 20 px de separación de la fila. Los 1100 px van en rem (68,75 rem) para que Tailwind ordene
 * esa regla después de la de `md` (48 rem): con unidades distintas no las ordena.
 */
const CAROUSEL_CARD_CLASS =
  'h-full w-[min(84cqw,380px)] md:w-[calc((min(100cqw,var(--site-max))-2*var(--site-gutter)-20px)/2)] min-[68.75rem]:w-[calc((min(100cqw,var(--site-max))-2*var(--site-gutter)-40px)/3)]'

/** Props de {@link HomeCombos}. */
export interface HomeCombosProps {
  /** Combos a la venta, por posición (como mucho seis, ver `HomeData.combos`). */
  combos: readonly Combo[]
  /** Ajustes públicos: cuotas y precio sin impuestos de las tarjetas. */
  settings: Pick<PublicSettings, 'installments' | 'priceDisplay'>
}

/** Props de {@link CombosHeader}. */
interface CombosHeaderProps {
  /** `id` del título, para nombrar la sección. */
  titleId?: string
  /** Si el título y la bajada aparecen solos (en la grilla; en el carrusel aparece todo junto). */
  reveal: boolean
}

/** Título y bajada de la sección. */
function CombosHeader({ titleId, reveal }: CombosHeaderProps): ReactNode {
  const title = (
    <h2 id={titleId} className={HOME_SECTION_TITLE}>
      {HOME_COPY.combos.title}
    </h2>
  )
  const textClass = 'm-0 max-w-[44ch] text-[16px] leading-[1.65] text-neutral-300'
  return (
    <div className="flex flex-col gap-4">
      {reveal ? <Reveal kind="up">{title}</Reveal> : title}
      {reveal ? (
        <Reveal kind="up" as="p" delay={100} className={textClass}>
          {HOME_COPY.combos.text}
        </Reveal>
      ) : (
        <p className={textClass}>{HOME_COPY.combos.text}</p>
      )}
    </div>
  )
}

/**
 * Sección "Combos listos para cebar" del inicio (Ruling IC-12, `research-design.md` §3), entre las
 * líneas y los destacados: el título y la bajada fijos de `HOME_COPY` y una tarjeta `ComboCard`
 * por combo. Desde 768 px, con hasta tres combos, van en una grilla (cada tarjeta aparece al llegar
 * a ella, escalonada); con más de tres, o en el celular aunque haya uno, en el carrusel con flechas
 * (`ArrowCarousel`, las flechas a la derecha del título o debajo de la fila) que aparece entero de
 * una vez. Sin combos no se dibuja nada.
 *
 * El ancho de la pantalla se conoce en el navegador: el servidor y la hidratación dibujan el
 * carrusel y desde 768 px pasa a la grilla enseguida, antes de que la sección llegue a la pantalla
 * (está debajo de la portada y de las líneas).
 *
 * @param props - Ver {@link HomeCombosProps}.
 */
export function HomeCombos({ combos, settings }: HomeCombosProps): ReactNode {
  const titleId = useId()
  const wide = useMediaQuery(WIDE_QUERY)
  if (combos.length === 0) return null
  const { installments, priceDisplay } = settings

  if (wide && combos.length <= COMBOS_GRID_MAX) {
    return (
      <section aria-labelledby={titleId} className={SECTION_TOP}>
        <div className={HOME_CONTAINER}>
          <div className="mb-10">
            <CombosHeader titleId={titleId} reveal />
          </div>
          <div
            data-combos-grid=""
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-5 min-[1100px]:grid-cols-3"
          >
            {combos.map((combo, index) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                installments={installments}
                showNetPrice={priceDisplay.showNetPrice}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const { carousel } = HOME_COPY.combos
  return (
    <div className={`${SECTION_TOP} @container`}>
      <Reveal kind="up">
        <ArrowCarousel
          label={carousel.label}
          itemLabel={carousel.item}
          prevLabel={carousel.previous}
          nextLabel={carousel.next}
          header={<CombosHeader reveal={false} />}
        >
          {combos.map((combo) => (
            <div key={combo.id} className={CAROUSEL_CARD_CLASS}>
              <ComboCard
                combo={combo}
                installments={installments}
                showNetPrice={priceDisplay.showNetPrice}
                entrance={false}
              />
            </div>
          ))}
        </ArrowCarousel>
      </Reveal>
    </div>
  )
}
