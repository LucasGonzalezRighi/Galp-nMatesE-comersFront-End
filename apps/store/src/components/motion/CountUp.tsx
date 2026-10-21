'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useInView } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useRevealDisabled } from './use-reveal-disabled'
import { assertFinite, assertIntegerInRange, assertNonNegative } from './validate'

/** Duración por omisión del conteo, en milisegundos. */
export const COUNT_UP_DURATION_MS = 1800

/** Oculta el texto a la vista pero lo deja disponible para los lectores de pantalla. */
const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/**
 * Da el formato argentino a una cifra: puntos de miles y coma decimal, con exactamente `decimals` decimales.
 *
 * @param value - Número a mostrar.
 * @param decimals - Cantidad de decimales, de 0 a 6.
 * @param prefix - Texto antes de la cifra, por ejemplo `$`.
 * @param suffix - Texto después de la cifra, por ejemplo `%`.
 * @returns El texto, por ejemplo `4,8` o `$1.234,50`.
 * @throws {RangeError} Si `value` no es finito o `decimals` no es un entero de 0 a 6.
 * @example
 * formatCount(4.8, 1) // '4,8'
 */
export function formatCount(value: number, decimals = 0, prefix = '', suffix = ''): string {
  assertFinite('value', value)
  assertIntegerInRange('decimals', decimals, 0, 6)
  const number = value.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${prefix}${number}${suffix}`
}

/**
 * Valor que se muestra en un instante del conteo: arranca rápido y frena al llegar (curva
 * exponencial del diseño). Con el progreso completo devuelve exactamente `target`.
 *
 * @param progress - Avance del tiempo, de 0 a 1 (se recorta a ese rango).
 * @param target - Valor final.
 * @returns El valor intermedio.
 */
export function countUpValue(progress: number, target: number): number {
  if (progress >= 1) return target
  if (progress <= 0) return 0
  return target * (1 - 2 ** (-10 * progress))
}

/** Props de {@link CountUp}. */
export interface CountUpProps {
  /** Valor final. */
  value: number
  /** Cantidad de decimales (de 0 a 6), con coma decimal. Por omisión 0. */
  decimals?: number
  /** Texto antes de la cifra, por ejemplo `$`. */
  prefix?: string
  /** Texto después de la cifra, por ejemplo `%`. */
  suffix?: string
  /** Duración del conteo, en milisegundos. Por omisión 1800. */
  duration?: number
  /** Clase del contenedor. */
  className?: string
}

/** Props de la parte que cuenta. */
interface CountingProps extends Required<Omit<CountUpProps, 'className'>> {
  /** El texto final, ya formateado. */
  finalText: string
  /** Clase del contenedor. */
  className: string | undefined
}

/** La cifra que cuenta desde 0 cuando entra en pantalla. */
function Counting({
  value,
  decimals,
  prefix,
  suffix,
  duration,
  finalText,
  className,
}: CountingProps): ReactNode {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.08, margin: '0px 0px -6% 0px' })
  // `null` significa "mostrar el valor final": antes de entrar en pantalla y al terminar.
  const [counting, setCounting] = useState<string | null>(null)

  useEffect(() => {
    if (!inView) return
    let frame = 0
    let start: number | undefined
    const step = (now: number): void => {
      start ??= now
      const progress = duration === 0 ? 1 : Math.min(1, (now - start) / duration)
      setCounting(
        progress >= 1 ? null : formatCount(countUpValue(progress, value), decimals, prefix, suffix),
      )
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [inView, value, decimals, prefix, suffix, duration])

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{counting ?? finalText}</span>
      <span style={VISUALLY_HIDDEN}>{finalText}</span>
    </span>
  )
}

/**
 * Cifra que cuenta desde 0 hasta `value` (1800 ms, arrancando rápido y frenando) cuando entra en
 * pantalla, y termina en el valor exacto con el formato argentino (coma decimal).
 *
 * El HTML trae siempre el valor final, así que se ve completo sin JavaScript y con
 * `prefers-reduced-motion: reduce` (ahí no se anima). Los lectores de pantalla leen solo el valor
 * final, no los números intermedios.
 *
 * @param props - Ver {@link CountUpProps}.
 * @throws {RangeError} Si `value` no es finito, `decimals` no es un entero de 0 a 6 o `duration`
 *   es negativa.
 * @example
 * <CountUp value={4.8} decimals={1} /> // termina en "4,8"
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = COUNT_UP_DURATION_MS,
  className,
}: CountUpProps): ReactNode {
  const finalText = formatCount(value, decimals, prefix, suffix)
  assertNonNegative('duration', duration)
  const disabled = useRevealDisabled()
  if (disabled) return <span className={className}>{finalText}</span>
  return (
    <Counting
      value={value}
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      duration={duration}
      finalText={finalText}
      className={className}
    />
  )
}
