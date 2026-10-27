'use client'

import { useRef, useState } from 'react'
import type { ShakeHandle } from '@/components/motion'

/** Lo que devuelve {@link useStepForm}. */
export interface StepForm<F extends string> {
  /** Error del campo para mostrar: solo después de salir del campo o de intentar avanzar. */
  error: (field: F) => string | null
  /** Marca el campo como visitado (al salir de él). */
  touch: (field: F) => void
  /** Referencia al control del campo, para llevarle el foco. */
  inputRef: (field: F) => (element: HTMLElement | null) => void
  /** Referencia al `Shake` del campo, para hacerlo temblar. */
  shakeRef: (field: F) => (handle: ShakeHandle | null) => void
  /**
   * Revisa el paso al intentar avanzar: muestra todos los errores y, si hay alguno, el primer
   * campo con error (en el orden del formulario) tiembla y recibe el foco.
   *
   * @returns Si el paso no tiene errores.
   */
  check: () => boolean
}

/**
 * Estado de validación de un paso del checkout (spec 14.1 y 15): los errores aparecen al salir de
 * cada campo y al intentar avanzar, no mientras se escribe por primera vez. Al avanzar con errores,
 * el primero tiembla (`Shake`) y recibe el foco.
 *
 * @param fields - Campos del paso, en el orden del formulario.
 * @param errors - Error de cada campo según su schema (`toFieldErrors`); sin clave si está bien.
 * @throws {RangeError} Si no se pasa ningún campo.
 */
export function useStepForm<F extends string>(
  fields: readonly F[],
  errors: Readonly<Partial<Record<F, string>>>,
): StepForm<F> {
  if (fields.length === 0) throw new RangeError('El paso tiene que tener al menos un campo.')
  const [touched, setTouched] = useState<ReadonlySet<F>>(new Set())
  const inputs = useRef<Partial<Record<F, HTMLElement | null>>>({})
  const shakes = useRef<Partial<Record<F, ShakeHandle | null>>>({})
  return {
    error: (field) => (touched.has(field) ? (errors[field] ?? null) : null),
    touch: (field) => {
      setTouched((current) => (current.has(field) ? current : new Set(current).add(field)))
    },
    inputRef: (field) => (element) => {
      inputs.current[field] = element
    },
    shakeRef: (field) => (handle) => {
      shakes.current[field] = handle
    },
    check: () => {
      setTouched(new Set(fields))
      const first = fields.find((field) => errors[field] !== undefined)
      if (first === undefined) return true
      shakes.current[first]?.shake()
      inputs.current[first]?.focus()
      return false
    },
  }
}
