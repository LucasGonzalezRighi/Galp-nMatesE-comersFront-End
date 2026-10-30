'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { domAnimation, LazyMotion, m, useScroll, useTransform } from 'motion/react'
import { createContext, useContext, useMemo, useRef } from 'react'
import { EASE_MAIN, usePrefersReducedMotion } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { bridgeLook, cardLook, ENTRANCE_SHARE, titleLook } from './collection-entrance'
import { useMateStagePresent } from './mate-stage-presence'
import { YerbaDepth } from './YerbaDepth'

/** Lo que la entrada comparte con el título y las tarjetas: el avance, solo después del mate 3D. */
interface EntranceContextValue {
  /** Avance de la entrada, de 0 (la colección asoma abajo) a 1 (llegó al 15 % de arriba). */
  progress: MotionValue<number>
}

/** El avance de la entrada desde la profundidad; `null` sin el mate 3D (fundido o quieta). */
const EntranceContext = createContext<EntranceContextValue | null>(null)

/** Props de {@link CollectionEntrance}. */
export interface CollectionEntranceProps {
  /** La colección: su `HorizontalScroll`, con un {@link EntranceTitle} y {@link EntranceCard}s. */
  children: ReactNode
}

/** Props de las entradas de cada modo. */
interface ModeProps {
  /** La colección. */
  children: ReactNode
}

/** Con menos movimiento: la colección queda quieta, sin estilos de entrada. */
function StaticEntrance({ children }: ModeProps): ReactNode {
  return <div data-collection-entrance="static">{children}</div>
}

/** Sin el mate 3D (celular, ventanas bajas, sin WebGL de por medio): un fundido simple al asomar. */
function FadeEntrance({ children }: ModeProps): ReactNode {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        data-collection-entrance="fade"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '0px 0px -15% 0px' }}
        transition={{ duration: 0.6, ease: EASE_MAIN }}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}

/**
 * Después del mate 3D: la colección arranca desde la yerba en que termina la zambullida. La entrada
 * empieza una ventana más arriba (`-100svh`) para que la capa de yerba, fija arriba (`sticky`),
 * tape el escenario mientras se va; el resto no recibe el mouse, así no tapa los botones de la
 * última parada.
 */
function DiveEntrance({ children }: ModeProps): ReactNode {
  const contentRef = useRef<HTMLDivElement>(null)
  // De 0 (el borde de arriba de la colección asoma abajo) a 1 (llega arriba y el escenario ya se
  // fue): la entrada es el tramo hasta el 15 % de arriba (`ENTRANCE_SHARE`).
  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ['start end', 'start start'],
  })
  const progress = useTransform(scrollYProgress, (value) =>
    Math.min(1, Math.max(0, value / ENTRANCE_SHARE)),
  )
  // La capa de yerba se ve solo mientras el escenario se va: antes la tapa la del escenario.
  const visibility = useTransform(scrollYProgress, (value) =>
    value > 0 && value < 1 ? 'visible' : 'hidden',
  )
  const transform = useTransform(progress, (value) => bridgeLook(value).transform)
  const filter = useTransform(progress, (value) => bridgeLook(value).filter)
  const opacity = useTransform(progress, (value) => bridgeLook(value).opacity)
  const context = useMemo<EntranceContextValue>(() => ({ progress }), [progress])

  return (
    <EntranceContext value={context}>
      <LazyMotion features={domAnimation}>
        <div
          data-collection-entrance="dive"
          className="pointer-events-none relative -mt-[100vh] supports-[height:100svh]:-mt-[100svh]"
        >
          <m.div
            aria-hidden="true"
            data-collection-bridge=""
            className="bg-background sticky top-0 h-screen overflow-hidden supports-[height:100svh]:h-svh"
            style={{ visibility }}
          >
            <m.div
              data-collection-yerba=""
              className="absolute inset-0 will-change-[transform,opacity,filter]"
              style={{ transform, filter, opacity }}
            >
              <YerbaDepth />
            </m.div>
          </m.div>
          <div ref={contentRef} className="pointer-events-auto">
            {children}
          </div>
        </div>
      </LazyMotion>
    </EntranceContext>
  )
}

/**
 * La entrada de la colección del inicio (Ruling MR-22). Después del mate 3D (`MateStage` montado,
 * ver `useMateStagePresent`) la colección sale de adentro del mate, pegada al scroll: la capa de
 * yerba en que terminó la zambullida se aleja y se disuelve (escala 1,15 → 1, desenfoque 0 → 10 px,
 * opacidad 1 → 0), el título sube con máscara ({@link EntranceTitle}) y las tarjetas salen de la
 * profundidad una tras otra ({@link EntranceCard}). La entrada dura desde que la colección asoma
 * abajo hasta que llega al 15 % de arriba; después la pista horizontal sigue igual. Sin el mate 3D
 * (celular, ventanas bajas) entra con un fundido simple, y con `prefers-reduced-motion: reduce`
 * queda quieta. Solo se animan `transform`, `opacity` y `filter`.
 *
 * @param props - Ver {@link CollectionEntranceProps}.
 */
export function CollectionEntrance({ children }: CollectionEntranceProps): ReactNode {
  const stage = useMateStagePresent()
  const reduced = usePrefersReducedMotion()
  if (reduced) return <StaticEntrance>{children}</StaticEntrance>
  if (stage) return <DiveEntrance>{children}</DiveEntrance>
  return <FadeEntrance>{children}</FadeEntrance>
}

/** Props de {@link EntranceTitle}. */
export interface EntranceTitleProps {
  /** Clase del `h2`. */
  className?: string
  /** El título. */
  children: ReactNode
}

/** La línea del título que sube dentro de la máscara, pegada al avance de la entrada. */
function RisingLine({ progress, children }: EntranceContextValue & ModeProps): ReactNode {
  const transform = useTransform(progress, (value) => titleLook(value).transform)
  return (
    <m.span data-entrance-title="" className="block" style={{ transform }}>
      {children}
    </m.span>
  )
}

/**
 * El título de la colección (`h2`). Después del mate 3D sube con máscara: su línea arranca debajo
 * del borde del título y llega a su lugar en la primera mitad de la entrada. El `h2` recorta lo que
 * asoma con un margen de 0,1 em arriba y abajo (los acentos y las patas de las letras no se cortan).
 *
 * @param props - Ver {@link EntranceTitleProps}.
 */
export function EntranceTitle({ className, children }: EntranceTitleProps): ReactNode {
  const entrance = useContext(EntranceContext)
  if (entrance === null) {
    return (
      <h2 className={className}>
        <span data-entrance-title="" className="block">
          {children}
        </span>
      </h2>
    )
  }
  return (
    <h2 className={cx(className, '-my-[0.1em] overflow-clip py-[0.1em]')}>
      <RisingLine progress={entrance.progress}>{children}</RisingLine>
    </h2>
  )
}

/** Props de {@link EntranceCard}. */
export interface EntranceCardProps {
  /** Posición de la tarjeta en la pista, desde 0: cuánto espera para salir. */
  index: number
  /** La tarjeta (de ancho fijo). */
  children: ReactNode
}

/** Props de {@link DepthCard}. */
interface DepthCardProps extends EntranceContextValue, ModeProps {
  /** Posición de la tarjeta en la pista, desde 0. */
  index: number
}

/** La tarjeta que sale de la profundidad, pegada al avance de la entrada. */
function DepthCard({ progress, index, children }: DepthCardProps): ReactNode {
  const transform = useTransform(progress, (value) => cardLook(value, index).transform)
  const filter = useTransform(progress, (value) => cardLook(value, index).filter)
  const opacity = useTransform(progress, (value) => cardLook(value, index).opacity)
  return (
    <m.div data-entrance-card="" className="flex-none" style={{ transform, filter, opacity }}>
      {children}
    </m.div>
  )
}

/**
 * Una tarjeta de la pista de la colección. Después del mate 3D sale de la profundidad
 * (`perspective(1200px) translateZ(-600px) rotateX(10deg) scale(0.7)`, 12 px de desenfoque y
 * transparente) hasta su lugar, 0,08 de avance después de la anterior; en su lugar no lleva
 * transformación ni filtro. Sin el mate 3D es una envoltura sin estilos.
 *
 * @param props - Ver {@link EntranceCardProps}.
 * @throws {RangeError} Si `index` no es un entero desde 0.
 */
export function EntranceCard({ index, children }: EntranceCardProps): ReactNode {
  const entrance = useContext(EntranceContext)
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(
      `La posición de la tarjeta tiene que ser un entero desde 0; se recibió ${String(index)}.`,
    )
  }
  if (entrance === null) {
    return (
      <div data-entrance-card="" className="flex-none">
        {children}
      </div>
    )
  }
  return (
    <DepthCard progress={entrance.progress} index={index}>
      {children}
    </DepthCard>
  )
}
