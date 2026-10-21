'use client'

import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './use-prefers-reduced-motion'
import { assertIntegerInRange } from './validate'

/**
 * Sube suavemente al principio de la página cada vez que cambia el paso de un asistente (el kit,
 * el checkout). No hace nada en el primer render. Con `prefers-reduced-motion: reduce` sube de
 * golpe, sin desplazamiento animado.
 *
 * @param step - Número del paso actual, un entero de 0 en adelante.
 * @throws {RangeError} Si `step` no es un entero mayor o igual a 0.
 * @example
 * useScrollTopOnStep(step)
 */
export function useScrollTopOnStep(step: number): void {
  assertIntegerInRange('step', step, 0, Number.MAX_SAFE_INTEGER)
  const reduced = usePrefersReducedMotion()
  const previous = useRef(step)
  useEffect(() => {
    if (previous.current === step) return
    previous.current = step
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }, [step, reduced])
}
