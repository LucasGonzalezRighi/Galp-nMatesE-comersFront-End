'use client'

import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertIntegerInRange } from './validate'

/**
 * Sube suavemente al principio de la página cada vez que cambia el paso de un asistente (el kit,
 * el checkout) y, si se le pasa el título del paso, lo enfoca sin desplazar (WCAG 2.4.3: el
 * teclado y el lector arrancan en el paso nuevo y el lector lo anuncia). El título necesita
 * `tabIndex={-1}`. No hace nada en el primer render. Con `prefers-reduced-motion: reduce` sube de
 * golpe, sin desplazamiento animado.
 *
 * @param step - Número del paso actual, un entero de 0 en adelante.
 * @param heading - Referencia al título del paso actual (opcional).
 * @throws {RangeError} Si `step` no es un entero mayor o igual a 0.
 * @example
 * useScrollTopOnStep(step, stepTitle)
 */
export function useScrollTopOnStep(step: number, heading?: RefObject<HTMLElement | null>): void {
  assertIntegerInRange('step', step, 0, Number.MAX_SAFE_INTEGER)
  const reduced = usePrefersReducedMotion()
  const previous = useRef(step)
  useEffect(() => {
    if (previous.current === step) return
    previous.current = step
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
    heading?.current?.focus({ preventScroll: true })
  }, [step, reduced, heading])
}
