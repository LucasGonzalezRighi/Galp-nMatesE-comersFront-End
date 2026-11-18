import type { ReactNode } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight'
import Image from 'next/image'
import Link from 'next/link'
import type { HomeContent } from '@galpon/api-client'
import { Magnetic } from '../../components/motion'
import { Button, Tag } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { asRoute } from '../../lib/routes'
import { HeroTitleRow } from './HeroTitle'
import { HOME_ARROW_SIZE, HOME_PILL_BUTTON, HOME_STAGE_TITLE_SIZE } from './home-styles'
import { HOME_COPY } from './home.copy'
import { SceneReveal } from './SceneReveal'

/** Props de {@link HeroIntro}. */
export interface HeroIntroProps {
  /** Los textos editables de la portada. */
  hero: HomeContent['hero']
  /** Descuento del kit para mostrar en su botón ("−10%"), o `null` si no tiene. */
  kitDiscountLabel: string | null
  /** Clase extra de la fila de los dos botones (que va centrada en el ancho de la columna). */
  ctaClassName?: string
  /**
   * `true` si el texto ya entró en la página: el título se dibuja quieto, sin su animación de
   * entrada (el mate 3D lo pone porque se monta después de que la portada del v4, `HeroCarousel`,
   * ya lo mostró).
   */
  entered?: boolean
}

/**
 * El texto de la portada del inicio (spec 9.5): la píldora con la marca, el título "Encontrá tu
 * mate." (el único `h1` del inicio), la bajada y los botones "Ver la tienda" y "Armá tu kit" (con
 * el descuento del kit). Lo usa la primera parada del mate 3D (`MateStage`); donde no hay 3D la
 * portada es `HeroCarousel`. El título va en un renglón y solo los botones, centrados en el ancho
 * de la columna; la bajada sigue a la izquierda (Ruling AI-4). El título entra con CSS, sin
 * esperar a JavaScript, y el resto aparece con `SceneReveal`; con `entered` (y, para el resto,
 * dentro de `StaticRevealContext`) todo se dibuja ya en su lugar, así el cambio de la portada del
 * v4 (tapada por la intro) al mate 3D no repite la entrada.
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
      <h1
        className={cx(HOME_STAGE_TITLE_SIZE, 'leading-[0.9] tracking-[-0.05em] whitespace-nowrap')}
      >
        <HeroTitleRow lines={hero.titleLines} entered={entered} />
      </h1>
      <SceneReveal
        kind="up"
        as="p"
        delay={200}
        className="max-w-[40ch] text-[clamp(16px,1.3vw,19px)] leading-[1.6] text-neutral-300"
      >
        {hero.text}
      </SceneReveal>
      <SceneReveal
        kind="up"
        delay={320}
        className={cx('flex flex-wrap justify-center gap-[14px]', ctaClassName)}
      >
        <Magnetic>
          <Button asChild variant="primary" size="lg" className={HOME_PILL_BUTTON}>
            <Link href={asRoute('/tienda')}>
              {hero.primaryCtaLabel}
              <ArrowRightIcon size={HOME_ARROW_SIZE} aria-hidden="true" />
            </Link>
          </Button>
        </Magnetic>
        <Magnetic>
          <Button asChild variant="secondary" size="lg" className="rounded-full!">
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
