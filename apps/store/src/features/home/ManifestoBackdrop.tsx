'use client'

import type { ReactNode, RefObject } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import Image from 'next/image'
import { useRef } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../../components/motion'

/** La foto del yerbal (1920 × 1072). */
const YERBAL_PHOTO = '/hero/world/yerbal.jpg'

/** Desde este ancho la sección se enciende al entrar y la foto entra con el zoom grande. */
const DESKTOP_QUERY = '(min-width: 1024px)'

/** La foto, decorativa: la frase del Manifiesto no la necesita. */
function YerbalPhoto(): ReactNode {
  return (
    <Image
      src={YERBAL_PHOTO}
      alt=""
      aria-hidden="true"
      fill
      loading="lazy"
      sizes="100vw"
      className="object-cover"
    />
  )
}

/** Props de {@link MovingPhoto}. */
interface MovingPhotoProps {
  /** El fondo entero, del tamaño de la sección: es lo que se mide contra la ventana. */
  target: RefObject<HTMLDivElement | null>
  /** Si la ventana mide 1024 px o más: la entrada grande y la capa que se enciende. */
  wide: boolean
}

/**
 * La foto con zoom al entrar y parallax mientras se ve. La capa de la foto sobra un 6 % arriba y
 * abajo y el parallax la corre un 5 % de su alto: nunca deja ver un borde, aunque la escala llegue a 1.
 * En escritorio, además, la capa oscura de encima pasa de 1 a 0 mientras la foto entra: la sección se
 * enciende.
 */
function MovingPhoto({ target, wide }: MovingPhotoProps): ReactNode {
  // Entrada: de que asoma abajo a que llega al 20 % de arriba (escritorio) o arriba de la ventana.
  const { scrollYProgress: enter } = useScroll({
    target,
    offset: wide ? ['start end', 'start 20%'] : ['start end', 'start start'],
  })
  // Parallax: todo el tiempo que la sección está a la vista.
  const { scrollYProgress: pass } = useScroll({ target, offset: ['start end', 'end start'] })
  const scale = useTransform(enter, [0, 1], [wide ? 1.25 : 1.12, 1])
  const y = useTransform(pass, [0, 1], ['-5%', '5%'])
  const shade = useTransform(enter, [0, 1], [1, 0])
  return (
    <>
      <m.div
        data-manifesto-photo=""
        className="absolute inset-x-0 -inset-y-[6%]"
        style={{ scale, y, willChange: 'transform' }}
      >
        <YerbalPhoto />
      </m.div>
      <Veil />
      {wide ? (
        <m.div
          data-manifesto-shade=""
          className="bg-background absolute inset-0"
          style={{ opacity: shade }}
        />
      ) : null}
    </>
  )
}

/** El velo que oscurece la foto para que la frase se lea (ver {@link ManifestoBackdrop}). */
function Veil(): ReactNode {
  return (
    <div
      data-manifesto-veil=""
      className="from-background/90 via-background/68 to-background/78 absolute inset-0 bg-linear-to-b via-66%"
    />
  )
}

/**
 * Fondo del Manifiesto: la foto del yerbal a sangre y el velo que la oscurece para que la frase
 * se lea: un degradé de `background` del 90 % arriba al 68 % a los dos tercios y al 78 % abajo
 * (más oscuro en el tercio de abajo, donde va el link: deja ver entre el 10 y el 32 % de la foto).
 * Con el halo y el cobre claro de `HomeManifesto`, medido en la tienda a 1440 y a 390 px, el
 * rótulo, la frase y el link quedan a 4,8:1 o más del píxel más claro de su zona. Va adentro de
 * una sección `relative overflow-hidden`, debajo del contenido (que lleva `relative z-10`).
 *
 * Con movimiento la foto entra con zoom y hace parallax (`y` −5 % → 5 % de su alto mientras se ve,
 * sobre una capa que sobra un 6 % arriba y abajo: nunca se ve un borde). Desde 1024 px la entrada se
 * nota (Lucas, 2026-10-29): la escala va de 1,25 a 1 mientras la sección sube hasta el 20 % de
 * arriba de la ventana, y en el mismo tramo una capa del color de fondo, encima del velo, pasa de
 * opacidad 1 a 0: la sección se enciende al entrar. En el celular el zoom es el suave (1,12 → 1
 * hasta el borde de arriba) y no hay capa. Con `prefers-reduced-motion: reduce` queda quieta, sin
 * estilos en línea.
 */
export function ManifestoBackdrop(): ReactNode {
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(DESKTOP_QUERY)
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {reduced ? (
        <>
          <div data-manifesto-photo="" className="absolute inset-0">
            <YerbalPhoto />
          </div>
          <Veil />
        </>
      ) : (
        <LazyMotion features={domAnimation}>
          {/*
           * Se monta de nuevo si cambia el ancho (la hidratación arranca sin ventana, como celular):
           * motion pasa a la línea de tiempo nativa del navegador la opacidad atada al tramo del
           * primer render y no la suelta, y la capa oscura quedaba en 0 (medido en la tienda).
           */}
          <MovingPhoto key={wide ? 'wide' : 'narrow'} target={ref} wide={wide} />
        </LazyMotion>
      )}
    </div>
  )
}
