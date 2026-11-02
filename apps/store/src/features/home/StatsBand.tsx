'use client'

import type { ReactNode } from 'react'
import { useInView } from 'motion/react'
import { useRef } from 'react'
import { CountUp, formatCount, Reveal } from '../../components/motion'
import { cx } from '../../components/ui/cx'

/** Cuánto tarda el conteo de las cifras, en milisegundos (Ruling MR-25: ~1,6 s). */
export const STATS_COUNT_MS = 1600

/** Una cifra de la banda. */
export interface StatFigure {
  /** El número final, entero. */
  value: number
  /** El rótulo de abajo, por ejemplo "Piezas en catálogo". */
  label: string
}

/** Props de {@link StatsBand}. */
export interface StatsBandProps {
  /** Las cuatro cifras, en orden. */
  figures: readonly StatFigure[]
  /** Clases de la grilla (el contenedor de la página). */
  className?: string
}

/**
 * Qué parte de la banda tiene que estar a la vista para que cuente: "entera", con un margen de un
 * subpíxel. Clavada (sticky) el navegador la mide al 0,99999, así que con `amount: 'all'` (1) no
 * contaba si se llegaba de un salto (una rueda de 100 px saltea el tramo en que la banda se ve
 * entera antes de clavarse) y se quedaba en 0.
 */
const STATS_IN_VIEW = 0.98

/** Clase del número: grande, con cifras de ancho fijo. */
const NUMBER_CLASS =
  'm-0 grid justify-items-center text-[clamp(52px,6vw,84px)] leading-none font-medium tracking-[-0.03em] tabular-nums'

/**
 * La banda de cifras del inicio (Rulings MR-25 y MR-26): cada cifra es una columna centrada, con el
 * número centrado sobre su rótulo, y las cuatro repartidas parejo en el ancho. Las cuatro cuentan a
 * la vez de 0 a su número (`CountUp` con `start`, 1,6 s, frenando al llegar) recién cuando la banda
 * está entera a la vista (`useInView` con `amount` 0,98, ver {@link STATS_IN_VIEW}; en escritorio, cuando el bloque del
 * Manifiesto quedó clavado), una sola vez por carga. El número final ocupa su lugar desde el
 * principio (una copia invisible en la misma celda), así contar no mueve el centro ni el resto. Con
 * menos movimiento se ve el número final directo; el HTML del servidor también lo trae.
 *
 * @param props - Ver {@link StatsBandProps}.
 */
export function StatsBand({ figures, className }: StatsBandProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const started = useInView(ref, { once: true, amount: STATS_IN_VIEW })
  return (
    <div ref={ref} data-stats-band="" className={cx('grid', className)}>
      {figures.map((figure, position) => (
        <Reveal
          key={figure.label}
          kind="up"
          delay={position * 100}
          className="flex flex-col items-center text-center"
        >
          <p className={NUMBER_CLASS}>
            {/* El ancho del número final, reservado: el conteo crece centrado adentro. */}
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              {formatCount(figure.value)}
            </span>
            <CountUp
              value={figure.value}
              start={started}
              duration={STATS_COUNT_MS}
              className="col-start-1 row-start-1"
            />
          </p>
          <p className="text-foreground/66 mt-[14px] mb-0 text-[13px] tracking-[0.08em] uppercase">
            {figure.label}
          </p>
        </Reveal>
      ))}
    </div>
  )
}
