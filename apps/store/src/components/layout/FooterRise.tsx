'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useMediaQuery, usePrefersReducedMotion } from '../motion'
import { MotionFeatures } from '../motion/MotionFeatures'
import { clampCover, footerRowShare, useFooterStage } from './footer-rise'

/** Desde este ancho el pie sube por encima de las reseñas quietas (como `footer.css`). */
const DESKTOP_QUERY = '(min-width: 1024px)'

/**
 * Cómo entra el contenido del pie: `rise` sube por encima de las reseñas quietas del inicio (filas
 * en cascada y GALPÓN al final); `scroll` es el de las demás páginas en escritorio (la palabra
 * sube apenas al entrar); `still` es sin movimiento o en el celular (todo a la vista, quieto).
 */
export type FooterMotionMode = 'rise' | 'scroll' | 'still'

/** Lo que el pie comparte con su contenido. */
interface FooterMotion {
  /** Cómo entra el contenido. */
  mode: FooterMotionMode
  /** Cuánto subió el pie, de 0 (asoma abajo) a 1 (llegó al final de la página). */
  cover: MotionValue<number> | null
}

/** Sin `FooterRise` alrededor, todo queda a la vista y quieto. */
const FooterMotionContext = createContext<FooterMotion>({ mode: 'still', cover: null })

/** Nada que escuchar: solo distingue el servidor y la hidratación del resto. */
function subscribeNothing(): () => void {
  return () => undefined
}

/** Si ya pasó la hidratación (en el servidor y al hidratar, `false`). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
}

/**
 * Cómo entra el contenido del pie y cuánto subió (ver {@link FooterRise}).
 *
 * @returns El modo y el avance de la subida (`null` fuera de `FooterRise`).
 */
export function useFooterMotion(): FooterMotion {
  return useContext(FooterMotionContext)
}

/** Props de {@link FooterRise}. */
export interface FooterRiseProps {
  /** Clases del `<footer>`. */
  className?: string
  /** El contenido del pie. */
  children: ReactNode
}

/**
 * El `<footer>` del sitio con lo que necesita para subir por encima de las reseñas quietas del
 * inicio, como el del portafolio de Lucas: publica su alto en `--footer-h` de `<html>` (con un
 * `ResizeObserver`; se borra al desmontarse), que usan el recorrido de las reseñas
 * (`FooterStage`) y el margen negativo de `footer.css`, y mide cuánto subió (`useScroll` sobre sí
 * mismo, de `start end` a `end end`) para que sus filas ({@link FooterRow}) y la palabra GALPÓN
 * entren pegadas al scroll.
 *
 * El modo sale del aviso de las reseñas quietas (`useFooterStage`), de `prefers-reduced-motion` y
 * del ancho: `rise` solo con reseñas quietas, con movimiento y desde 1024 px; `still` con menos
 * movimiento o en el celular; `scroll` en el resto, y también en el servidor y en la hidratación
 * (que no conocen la ventana), como el pie de siempre.
 *
 * @param props - Ver {@link FooterRiseProps}.
 */
export function FooterRise({ className, children }: FooterRiseProps): ReactNode {
  const ref = useRef<HTMLElement>(null)
  const stage = useFooterStage()
  const reduced = usePrefersReducedMotion()
  const wide = useMediaQuery(DESKTOP_QUERY)
  const hydrated = useHydrated()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  useEffect(() => {
    const footer = ref.current
    if (footer === null) return undefined
    const root = document.documentElement
    const publish = (): void => {
      root.style.setProperty('--footer-h', `${String(footer.offsetHeight)}px`)
    }
    publish()
    // Sin `ResizeObserver` (navegadores viejos, jsdom) queda el alto del primer render.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null
    observer?.observe(footer)
    return () => {
      observer?.disconnect()
      root.style.removeProperty('--footer-h')
    }
  }, [])
  let mode: FooterMotionMode = 'scroll'
  if (reduced || (hydrated && !wide)) mode = 'still'
  else if (stage && wide) mode = 'rise'
  const motion = useMemo(() => ({ mode, cover: scrollYProgress }), [mode, scrollYProgress])
  return (
    <footer ref={ref} className={className}>
      <FooterMotionContext value={motion}>
        <MotionFeatures>{children}</MotionFeatures>
      </FooterMotionContext>
    </footer>
  )
}

/** Props de {@link FooterRow}. */
export interface FooterRowProps {
  /**
   * La fila, desde 0: define cuándo entra (ver `footerRowShare`). Con decimales se desfasan menos
   * las columnas de una misma fila.
   */
  index: number
  /** Clases de la fila. */
  className?: string
  /** El contenido de la fila. */
  children: ReactNode
}

/** Props de {@link RisingRow}. */
interface RisingRowProps extends FooterRowProps {
  /** Cuánto subió el pie. */
  cover: MotionValue<number>
}

/** La fila que entra con la subida del pie. */
function RisingRow({ index, className, children, cover }: RisingRowProps): ReactNode {
  const share = useTransform(cover, (value) => footerRowShare(clampCover(value), index))
  const y = useTransform(share, (value) => (1 - value) * 28)
  // Nítida del todo, sin filtro: un `blur(0px)` igual le costaría una capa al navegador.
  const filter = useTransform(share, (value) =>
    value >= 0.999 ? 'none' : `blur(${String((1 - value) * 6)}px)`,
  )
  return (
    <m.div
      data-footer-row={String(index)}
      className={className}
      style={{ opacity: share, y, filter }}
    >
      {children}
    </m.div>
  )
}

/**
 * Una fila del pie (la frase con el mail, un grupo de links, los datos del vendedor, el copyright
 * con los medios de pago). Cuando el pie sube por encima de las reseñas quietas (modo `rise` de
 * {@link FooterRise}) entra pegada al scroll: de transparente, 28 px más abajo y desenfocada 6 px a
 * nítida y en su lugar, en su tramo y con la curva senoidal (`footerRowShare`). En los demás modos
 * se dibuja quieta, sin estilos en línea.
 *
 * @param props - Ver {@link FooterRowProps}.
 */
export function FooterRow({ index, className, children }: FooterRowProps): ReactNode {
  const { mode, cover } = useFooterMotion()
  if (mode !== 'rise' || cover === null) {
    return (
      <div data-footer-row={String(index)} className={className}>
        {children}
      </div>
    )
  }
  return (
    <RisingRow index={index} className={className} cover={cover}>
      {children}
    </RisingRow>
  )
}
