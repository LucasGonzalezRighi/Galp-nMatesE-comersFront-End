import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Image from 'next/image'
import Link from 'next/link'
import type { HomeContent } from '@galpon/api-client'
import { Magnetic } from '../../components/motion'
import { Button, Tag } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { HOME_ARROW_SIZE, HOME_PILL_BUTTON } from './home-styles'
import { HOME_COPY } from './home.copy'
import { SceneReveal } from './SceneReveal'

/** Retardo de entrada de cada línea del título, en milisegundos (los 60 y 180 del diseño). */
const TITLE_LINE_DELAYS_MS = [60, 180] as const

/** Props de {@link HeroIntro}. */
export interface HeroIntroProps {
  /** Los textos editables de la portada. */
  hero: HomeContent['hero']
  /** Descuento del kit para mostrar en su botón ("−10%"), o `null` si no tiene. */
  kitDiscountLabel: string | null
  /** Clase de la fila de los dos botones (en la portada van abajo y centrados; en el mate 3D, en la columna). */
  ctaClassName?: string
  /**
   * `true` si el texto ya entró en la página: el título se dibuja quieto, sin su animación de
   * entrada (el mate 3D lo pone porque se monta después de que la portada del servidor ya lo mostró).
   */
  entered?: boolean
}

/**
 * El texto de la portada del inicio (spec 9.5): la píldora con la marca, el título "Encontrá tu
 * mate." (el único `h1` del inicio), la bajada y los botones "Ver la tienda" y "Armá tu kit" (con
 * el descuento del kit). Lo usan la portada del servidor y del celular (`HomeHero`) y la primera
 * parada del mate 3D (`MateStage`). El título entra con CSS, sin esperar a JavaScript, y el resto
 * aparece con `SceneReveal`; con `entered` (y, para el resto, dentro de `StaticRevealContext`)
 * todo se dibuja ya en su lugar, así el cambio de la portada del servidor al mate 3D no repite la
 * entrada.
 *
 * @param props - Ver {@link HeroIntroProps}.
 */
export function HeroIntro({
  hero,
  kitDiscountLabel,
  ctaClassName,
  entered = false,
}: HeroIntroProps): ReactNode {
  return (
    <>
      <SceneReveal
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
      </SceneReveal>
      <h1 className="text-[clamp(54px,7.4vw,118px)] leading-[0.9] tracking-[-0.05em] whitespace-nowrap">
        {hero.titleLines.map((line, position) => (
          <span key={`${String(position)}-${line}`} className="block overflow-hidden pb-[0.1em]">
            <span
              className={cx(
                entered ? 'block' : 'home-rise block',
                position > 0 &&
                  'from-accent-300 to-accent-2-300 bg-linear-to-r bg-clip-text text-transparent [text-shadow:none]',
              )}
              style={
                entered
                  ? undefined
                  : { animationDelay: `${String(TITLE_LINE_DELAYS_MS[position] ?? 180)}ms` }
              }
            >
              {line}
            </span>
          </span>
        ))}
      </h1>
      <SceneReveal
        kind="up"
        as="p"
        delay={200}
        className="max-w-[40ch] text-[clamp(16px,1.3vw,19px)] leading-[1.6] text-neutral-300"
      >
        {hero.text}
      </SceneReveal>
      <SceneReveal kind="up" delay={320} className={cx('flex flex-wrap gap-[14px]', ctaClassName)}>
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
              {kitDiscountLabel === null ? null : <Tag variant="accent2">{kitDiscountLabel}</Tag>}
            </Link>
          </Button>
        </Magnetic>
      </SceneReveal>
    </>
  )
}
