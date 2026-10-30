'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useInView } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
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
  /**
   * Quién dispara el conteo. Sin esta prop, la cifra cuenta sola al entrar en pantalla. Con ella,
   * espera en 0 (una vez hidratada; el HTML del servidor trae el valor final) y cuenta recién
   * cuando pasa a `true`, por ejemplo cuando una banda de cifras está entera a la vista. Cuenta una
   * sola vez.
   */
  start?: boolean
  /** Clase del contenedor. */
  className?: string
}

/** Props de la parte que cuenta. */
interface CountingProps extends Required<Omit<CountUpProps, 'className' | 'start'>> {
  /** El disparo de quien lo usa; `undefined` si la cifra cuenta sola al entrar en pantalla. */
  start: boolean | undefined
  /** El texto final, ya formateado. */
  finalText: string
  /** Clase del contenedor. */
  className: string | undefined
}

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

/** La cifra que cuenta desde 0 cuando entra en pantalla (o cuando `start` pasa a `true`). */
function Counting({
  value,
  decimals,
  prefix,
  suffix,
  duration,
  start,
  finalText,
  className,
}: CountingProps): ReactNode {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.08, margin: '0px 0px -6% 0px' })
  const hydrated = useHydrated()
  // Una vez disparado, sigue hasta el final aunque el disparo vuelva a `false`.
  const [fired, setFired] = useState(false)
  if ((start ?? inView) && !fired) setFired(true)
  // `null` significa "mostrar el valor final": antes de entrar en pantalla y al terminar.
  const [counting, setCounting] = useState<string | null>(null)

  useEffect(() => {
    if (!fired) return undefined
    let frame = 0
    let begin: number | undefined
    const step = (now: number): void => {
      begin ??= now
      const progress = duration === 0 ? 1 : Math.min(1, (now - begin) / duration)
      setCounting(
        progress >= 1 ? null : formatCount(countUpValue(progress, value), decimals, prefix, suffix),
      )
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [fired, value, decimals, prefix, suffix, duration])

  // Con disparo externo, una vez hidratada espera en 0 (el servidor trae el valor final).
  const waiting = start !== undefined && hydrated && !fired
  const shown = waiting ? formatCount(0, decimals, prefix, suffix) : (counting ?? finalText)

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{shown}</span>
      <span style={VISUALLY_HIDDEN}>{finalText}</span>
    </span>
  )
}

/**
 * Cifra que cuenta desde 0 hasta `value` (1800 ms, arrancando rápido y frenando: la curva
 * exponencial casi calca a `--ease-main`) cuando entra en pantalla, o cuando `start` pasa a `true`
 * si quien la usa decide el momento, y termina en el valor exacto con el formato argentino (coma
 * decimal). Cuenta una sola vez.
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
  start,
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
      start={start}
      finalText={finalText}
      className={className}
    />
  )
}
