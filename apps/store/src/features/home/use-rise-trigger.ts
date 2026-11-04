'use client'

import type { RefObject } from 'react'
import { useEffect, useState } from 'react'

/** Opciones de {@link useRiseTrigger}. */
export interface RiseTriggerOptions {
  /**
   * El margen del `IntersectionObserver` (`rootMargin`, de uno a cuatro valores en px o %): con
   * `'0px 0px -22% 0px'` el disparo es cuando el borde de arriba cruza el 78 % de la ventana.
   */
  margin: string
  /**
   * Si al salir de pantalla **por abajo** vuelve a esconderse (volver para arriba rearma la
   * entrada). Al salir por arriba queda visible. Sin `resetBelow` entra una sola vez.
   */
  resetBelow: boolean
}

/** Un valor del margen: un número (con signo y decimales) en px o en %. */
const MARGIN_VALUE = /^-?\d+(?:\.\d+)?(?:px|%)$/

/** Si `margin` es un `rootMargin` válido: de uno a cuatro valores en px o %. */
function isRootMargin(margin: string): boolean {
  const values = margin.trim().split(/\s+/)
  return values.length <= 4 && values.every((value) => MARGIN_VALUE.test(value))
}

/**
 * Dispara una entrada por posición para que corra por tiempo (Ruling AT-1): devuelve `false`
 * mientras el elemento no entró en pantalla (con el margen de `options.margin`) y `true` desde que
 * entra, así la animación corre entera a cualquier velocidad de scroll. Con `resetBelow` vuelve a
 * `false` si el elemento sale de pantalla por abajo (lo decide con `boundingClientRect.top` del
 * aviso: positivo es que quedó debajo); sin `resetBelow` deja de observar al entrar. Sin
 * `IntersectionObserver` devuelve `true` (nunca queda escondido). En el servidor es `false`.
 *
 * @param ref - El elemento que dispara (sin transformaciones propias, o se corre el disparo).
 * @param options - Ver {@link RiseTriggerOptions}.
 * @returns Si la entrada ya se disparó.
 * @throws {RangeError} Si `options.margin` no es un margen de `IntersectionObserver`.
 * @example
 * const shown = useRiseTrigger(titleRef, { margin: '0px 0px -22% 0px', resetBelow: false })
 */
export function useRiseTrigger(
  ref: RefObject<Element | null>,
  options: RiseTriggerOptions,
): boolean {
  const { margin, resetBelow } = options
  if (!isRootMargin(margin)) {
    throw new RangeError(
      `El margen de la entrada tiene que ser de uno a cuatro valores en px o %; se recibió "${margin}".`,
    )
  }
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return undefined
    }
    const target = ref.current
    if (target === null) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            if (!resetBelow) observer.disconnect()
          } else if (resetBelow && entry.boundingClientRect.top > 0) {
            setShown(false)
          }
        }
      },
      { rootMargin: margin },
    )
    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [ref, margin, resetBelow])

  return shown
}
