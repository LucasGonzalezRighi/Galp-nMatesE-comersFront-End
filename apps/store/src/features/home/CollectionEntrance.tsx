'use client'

import type { FocusEvent, ReactNode, RefObject } from 'react'
import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { useHeaderPin, usePrefersReducedMotion } from '../../components/motion'
import { cx } from '../../components/ui/cx'
import { useMateStagePresent } from './mate-stage-presence'
import { useRiseTrigger } from './use-rise-trigger'

/**
 * Cómo entra la colección: `static` con menos movimiento (quieta, sin estilos), `rise` sin el
 * escenario del mate 3D (celular, tableta, ventanas bajas: entra una vez al asomar) y `overlap` con
 * el escenario (se monta encima de su final y se rearma si se vuelve para arriba).
 */
export type EntranceMode = 'static' | 'rise' | 'overlap'

/** El título se dispara cuando su borde de arriba cruza el 78 % de la ventana. */
const TITLE_MARGIN = '0px 0px -22% 0px'

/** La fila se dispara cuando la primera tarjeta cruza el 90 % de la ventana. */
const ROW_MARGIN = '0px 0px -10% 0px'

/** Cuánto espera cada tarjeta después de la anterior, en ms. */
const CARD_STAGGER_MS = 70

/** Desde qué posición las tarjetas ya no esperan más (las que quedan fuera de la fila a la derecha). */
const CARD_STAGGER_CAP = 4

/** Con el escenario: 70 svh arriba (encima de su final) y sin tomar el mouse hasta entrar. */
const OVERLAP_CLASS = 'pointer-events-none relative -mt-[70vh] supports-[height:100svh]:-mt-[70svh]'

/** Ya a la vista, la fila (con su título y sus flechas) toma el mouse; lo demás deja pasar. */
const OVERLAP_SHOWN_CLASS = '[&_section]:pointer-events-auto'

/**
 * La colección entera (las flechas y el contador, que no tienen entrada propia) espera transparente
 * y aparece con el título en 600 ms: no quedan sobre la parada 3 mientras la colección asoma.
 */
const ROOT_CLASS = 'ease-main transition-opacity'
const ROOT_SHOWN_CLASS = 'opacity-100 duration-600'
const ROOT_HIDDEN_CLASS = 'opacity-0 duration-250'

/** La línea del título: sube dentro de la máscara en 600 ms; al rearmarse baja en 250 ms. */
const TITLE_LINE_CLASS = 'ease-main block transition-transform'
const TITLE_SHOWN_CLASS = 'transform-none duration-600'
const TITLE_HIDDEN_CLASS = '[transform:translateY(110%)] duration-250'

/** La tarjeta: sube 48 px con un fundido en 700 ms; al rearmarse se apaga en 250 ms, sin esperar. */
const CARD_CLASS = 'ease-main flex-none transition-[opacity,transform]'
const CARD_SHOWN_CLASS = 'transform-none opacity-100 duration-700'
const CARD_HIDDEN_CLASS = 'opacity-0 [transform:translateY(48px)_scale(0.97)] duration-250'

/** Qué ya está a la vista. */
interface EntranceState {
  /** Si el título ya está a la vista. */
  titleShown: boolean
  /** Si las tarjetas ya están a la vista. */
  rowShown: boolean
}

/** El `h2` del título, que dispara su entrada; `null` con menos movimiento (sin estados de entrada). */
const TitleTargetContext = createContext<RefObject<HTMLHeadingElement | null> | null>(null)

/** La primera tarjeta, que dispara la entrada de la fila; `null` con menos movimiento. */
const RowTargetContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

/** Lo que ya está a la vista en la entrada en curso; `null` con menos movimiento. */
const EntranceStateContext = createContext<EntranceState | null>(null)

/** Props de {@link CollectionEntrance}. */
export interface CollectionEntranceProps {
  /** La colección: su `ArrowCarousel`, con un {@link EntranceTitle} y {@link EntranceCard}s. */
  children: ReactNode
}

/** Props de {@link RiseEntrance}. */
interface RiseEntranceProps extends CollectionEntranceProps {
  /** `true` con el escenario del mate 3D (modo `overlap`). */
  overlap: boolean
}

/**
 * La entrada por tiempo: el título y la fila se disparan por posición ({@link useRiseTrigger}) y
 * corren enteros aunque el scroll siga. El foco adentro muestra todo.
 */
function RiseEntrance({ overlap, children }: RiseEntranceProps): ReactNode {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const titleTriggered = useRiseTrigger(titleRef, { margin: TITLE_MARGIN, resetBelow: overlap })
  const rowTriggered = useRiseTrigger(rowRef, { margin: ROW_MARGIN, resetBelow: overlap })
  const titleShown = focused || titleTriggered
  const rowShown = focused || rowTriggered
  const shown = titleShown || rowShown
  // Con el escenario, el encabezado vuelve apenas se revela "Categorías" (Ruling AT-1).
  useHeaderPin(overlap && titleShown)
  const state = useMemo<EntranceState>(() => ({ titleShown, rowShown }), [titleShown, rowShown])
  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  return (
    <TitleTargetContext value={titleRef}>
      <RowTargetContext value={rowRef}>
        <EntranceStateContext value={state}>
          <div
            data-collection-entrance={overlap ? 'overlap' : 'rise'}
            data-shown={String(shown)}
            className={cx(
              ROOT_CLASS,
              shown ? ROOT_SHOWN_CLASS : ROOT_HIDDEN_CLASS,
              overlap && OVERLAP_CLASS,
              overlap && shown && OVERLAP_SHOWN_CLASS,
            )}
            onFocus={() => {
              setFocused(true)
            }}
            onBlur={onBlur}
          >
            {children}
          </div>
        </EntranceStateContext>
      </RowTargetContext>
    </TitleTargetContext>
  )
}

/**
 * La entrada de la colección del inicio (Ruling AT-1): se dispara por posición y corre por tiempo,
 * así siempre se ve entera, a cualquier velocidad de scroll. El título sube con máscara
 * ({@link EntranceTitle}) cuando cruza el 78 % de la ventana y las tarjetas suben de a una
 * ({@link EntranceCard}) cuando la primera cruza el 90 %; las flechas y el contador aparecen con el
 * título (un fundido de toda la colección). Con el escenario del mate 3D
 * (`useMateStagePresent`) se monta 70 svh arriba, encima del final del escenario, sin tomar el
 * mouse hasta entrar: entra en el mismo gesto en que el mate se va por arriba, deja ver el
 * encabezado apenas se revela el título y se rearma si se vuelve para arriba (sale por abajo). Sin
 * el escenario (celular, tableta, ventanas bajas) entra una sola vez, y con
 * `prefers-reduced-motion: reduce` queda quieta, sin estilos en línea. Solo se animan `transform` y
 * `opacity`, con transiciones de CSS (fuera del hilo principal aunque three esté dibujando).
 *
 * @param props - Ver {@link CollectionEntranceProps}.
 */
export function CollectionEntrance({ children }: CollectionEntranceProps): ReactNode {
  const stage = useMateStagePresent()
  const reduced = usePrefersReducedMotion()
  const mode: EntranceMode = reduced ? 'static' : stage ? 'overlap' : 'rise'
  if (mode === 'static') return <div data-collection-entrance="static">{children}</div>
  return <RiseEntrance overlap={mode === 'overlap'}>{children}</RiseEntrance>
}

/** Props de {@link EntranceTitle}. */
export interface EntranceTitleProps {
  /** Clase del `h2`. */
  className?: string
  /** El título. */
  children: ReactNode
}

/**
 * El título de la colección (`h2`). Con movimiento sube con máscara: su línea arranca debajo del
 * borde del título (`translateY(110%)`) y llega a su lugar en 600 ms con `EASE_MAIN`. El `h2`
 * recorta lo que asoma con un margen de 0,1 em arriba y abajo (los acentos y las patas de las
 * letras no se cortan) y es el que dispara la entrada (no se mueve).
 *
 * @param props - Ver {@link EntranceTitleProps}.
 */
export function EntranceTitle({ className, children }: EntranceTitleProps): ReactNode {
  const titleRef = useContext(TitleTargetContext)
  const state = useContext(EntranceStateContext)
  if (titleRef === null || state === null) {
    return (
      <h2 className={className}>
        <span data-entrance-title="" className="block">
          {children}
        </span>
      </h2>
    )
  }
  const shown = state.titleShown
  return (
    <h2 ref={titleRef} className={cx(className, '-my-[0.1em] overflow-clip py-[0.1em]')}>
      <span
        data-entrance-title=""
        data-shown={String(shown)}
        className={cx(TITLE_LINE_CLASS, shown ? TITLE_SHOWN_CLASS : TITLE_HIDDEN_CLASS)}
      >
        {children}
      </span>
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

/**
 * Una tarjeta de la pista de la colección. Con movimiento espera transparente y 48 px más abajo
 * (`translateY(48px) scale(0.97)`, por clases) y sube a su lugar en 700 ms con `EASE_MAIN`, 70 ms
 * después de la anterior (con tope en la quinta); al rearmarse se apaga en 250 ms, todas a la vez.
 * La primera dispara la entrada de la fila. Con menos movimiento es una envoltura sin estilos.
 *
 * @param props - Ver {@link EntranceCardProps}.
 * @throws {RangeError} Si `index` no es un entero desde 0.
 */
export function EntranceCard({ index, children }: EntranceCardProps): ReactNode {
  const rowRef = useContext(RowTargetContext)
  const state = useContext(EntranceStateContext)
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError(
      `La posición de la tarjeta tiene que ser un entero desde 0; se recibió ${String(index)}.`,
    )
  }
  if (rowRef === null || state === null) {
    return (
      <div data-entrance-card="" className="flex-none">
        {children}
      </div>
    )
  }
  const shown = state.rowShown
  const delay = CARD_STAGGER_MS * Math.min(index, CARD_STAGGER_CAP)
  return (
    <div
      ref={index === 0 ? rowRef : undefined}
      data-entrance-card=""
      data-shown={String(shown)}
      className={cx(CARD_CLASS, shown ? CARD_SHOWN_CLASS : CARD_HIDDEN_CLASS)}
      style={shown ? { transitionDelay: `${String(delay)}ms` } : undefined}
    >
      {children}
    </div>
  )
}
