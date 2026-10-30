'use client'

import { useMotionValueEvent, useScroll } from 'motion/react'
import { useState } from 'react'
import { assertFinite, assertNonNegative } from './validate'

/** Hacia dónde se movió el scroll de la página por última vez. */
export type ScrollDirection = 'up' | 'down'

/** Umbral por omisión: hasta 80 px de scroll la página cuenta como "arriba de todo". */
const DEFAULT_OFFSET_PX = 80

/**
 * Calcula la dirección del scroll después de un movimiento. Hasta `offset` píxeles la página está
 * arriba de todo y la respuesta es siempre `up`; pasado el umbral, bajar es `down` y subir es `up`.
 * Si la posición no cambió se conserva la dirección anterior.
 *
 * @param previous - Posición anterior del scroll, en píxeles.
 * @param current - Posición actual del scroll, en píxeles.
 * @param offset - Umbral, en píxeles, por encima del cual bajar cuenta como `down`.
 * @param last - La dirección que había antes del movimiento.
 * @returns La dirección nueva.
 * @throws {RangeError} Si las posiciones no son finitas o el umbral es negativo o no finito.
 * @example
 * scrollDirectionAt(100, 140, 80, 'up') // 'down'
 */
export function scrollDirectionAt(
  previous: number,
  current: number,
  offset: number,
  last: ScrollDirection,
): ScrollDirection {
  assertFinite('previous', previous)
  assertFinite('current', current)
  assertNonNegative('offset', offset)
  if (current <= offset) return 'up'
  if (current > previous) return 'down'
  if (current < previous) return 'up'
  return last
}

/**
 * Dirección del scroll de la ventana: `down` mientras se baja pasados los `offset` píxeles y `up`
 * al subir o arriba de todo. Lee el scroll con `useScroll` de Motion (un solo listener compartido,
 * sincronizado con los cuadros), nunca con un listener propio, y vuelve a dibujar solo cuando la
 * dirección cambia. Sirve para el encabezado que se esconde al bajar y vuelve al subir.
 *
 * @param offset - Umbral en píxeles. Por omisión 80.
 * @returns `up` o `down`; en el servidor y al hidratar, `up`.
 * @throws {RangeError} Si `offset` es negativo o no finito.
 */
export function useScrollDirection(offset: number = DEFAULT_OFFSET_PX): ScrollDirection {
  assertNonNegative('offset', offset)
  const { scrollY } = useScroll()
  const [direction, setDirection] = useState<ScrollDirection>('up')

  useMotionValueEvent(scrollY, 'change', (current) => {
    setDirection((last) => scrollDirectionAt(scrollY.getPrevious() ?? 0, current, offset, last))
  })

  return direction
}
