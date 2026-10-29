import type { ReactNode } from 'react'
import Image from 'next/image'
import type { HomeData } from './home-data'
import { HeroIntro } from './HeroIntro'
import { HOME_CONTAINER } from './home-styles'
import { MATE_PHOTO, MATE_PHOTO_FRAMING } from './story-stops'

/** Props de {@link HomeHero}. */
export interface HomeHeroProps {
  /** Los datos del inicio. */
  data: HomeData
}

/**
 * Portada del inicio (escena 0, spec 9.5) tal como la dibuja el servidor y como queda en el
 * celular y con menos movimiento: el texto de la portada (`HeroIntro`: píldora, título "Encontrá tu
 * mate.", bajada y los botones "Ver la tienda" y "Armá tu kit") sobre la foto del mate a pantalla
 * completa, con el velo del color de fondo a la izquierda. En escritorio y con movimiento,
 * `HomeStory` la reemplaza por la primera parada del mate 3D (`MateStage`), que repite este texto.
 *
 * La foto, que es lo primero que se ve, se dibuja en el HTML y carga con prioridad.
 *
 * @param props - Ver {@link HomeHeroProps}.
 */
export function HomeHero({ data }: HomeHeroProps): ReactNode {
  return (
    <section className="home-hero relative flex items-center overflow-hidden">
      <div aria-hidden="true" data-hero-poster="" className="pointer-events-none absolute inset-0">
        <Image
          src={MATE_PHOTO}
          alt=""
          fill
          priority
          sizes="100vw"
          className="home-hero-poster object-cover"
          style={MATE_PHOTO_FRAMING}
        />
        {/* El velo: en el celular, parejo; desde 1024 px, a la izquierda como en el mate 3D. */}
        <div className="bg-background/55 absolute inset-0 lg:hidden" />
        <div className="from-background/85 via-background/45 absolute inset-y-0 left-0 hidden w-3/5 bg-linear-to-r to-transparent lg:block" />
        <div className="from-background/70 absolute inset-x-0 top-0 h-40 bg-linear-to-b to-transparent" />
        <div className="from-background/80 absolute inset-x-0 bottom-0 h-48 bg-linear-to-t to-transparent" />
      </div>
      <div
        className={`${HOME_CONTAINER} relative flex justify-start pt-[72px] pb-[calc(clamp(24px,6vh,64px)+120px)]`}
      >
        <div className="flex w-[min(100%,700px)] flex-col gap-6">
          <HeroIntro
            hero={data.content.hero}
            kitDiscountLabel={data.kitDiscountLabel}
            ctaClassName="absolute inset-x-0 bottom-[clamp(24px,6vh,64px)] justify-center"
          />
        </div>
      </div>
    </section>
  )
}
