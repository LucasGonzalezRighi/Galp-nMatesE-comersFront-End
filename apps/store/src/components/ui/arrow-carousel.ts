/**
 * La lógica pura de `ArrowCarousel`: a qué tarjeta pasa cada flecha, cómo se escriben el contador
 * y la posición, y qué tarjeta quedó al comienzo de la fila después de deslizarla. Sin DOM ni React
 * (como `fanNavigation.ts` del `TripsFan` de Hoy Estoy OOH): el componente mide y aplica.
 *
 * @packageDocumentation
 */
import { assertFinite, assertIntegerInRange } from '../motion/validate'
import { UI_COPY } from './ui.copy'

/** Hacia dónde mueve una flecha: `-1` a la tarjeta anterior, `1` a la siguiente. */
export type CarouselDirection = -1 | 1

/** Dígitos mínimos del contador: "01", no "1". */
const COUNTER_MIN_DIGITS = 2

/**
 * Exige una cantidad de tarjetas y una posición válidas.
 *
 * @param index - Posición, desde 0.
 * @param count - Cantidad de tarjetas.
 * @throws {RangeError} Si `count` no es un entero desde 1 o `index` no va de 0 a `count - 1`.
 */
function assertPosition(index: number, count: number): void {
  assertIntegerInRange('La cantidad de tarjetas', count, 1, Number.MAX_SAFE_INTEGER)
  assertIntegerInRange('La posición de la tarjeta', index, 0, count - 1)
}

/**
 * Índice de la tarjeta a la que pasa una flecha. Da la vuelta en los extremos: de la última se pasa
 * a la primera y de la primera a la última, así las flechas nunca quedan deshabilitadas.
 *
 * @param current - Índice de la tarjeta actual, desde 0.
 * @param direction - Flecha apretada.
 * @param count - Cantidad de tarjetas.
 * @returns El índice de destino, de 0 a `count - 1`.
 * @throws {RangeError} Si `count` no es un entero desde 1 o `current` no es una posición válida.
 * @example
 * stepIndex(6, 1, 7) // 0
 */
export function stepIndex(current: number, direction: CarouselDirection, count: number): number {
  assertPosition(current, count)
  return (((current + direction) % count) + count) % count
}

/**
 * El contador del carrusel: la posición contada desde 1 y el total, con cero a la izquierda.
 *
 * @param index - Posición, desde 0.
 * @param count - Cantidad de tarjetas.
 * @returns Por ejemplo "03 / 07"; con cien tarjetas o más, con los dígitos que tenga.
 * @throws {RangeError} Si `count` no es un entero desde 1 o `index` no es una posición válida.
 */
export function counterLabel(index: number, count: number): string {
  assertPosition(index, count)
  const pad = (value: number): string => String(value).padStart(COUNTER_MIN_DIGITS, '0')
  return `${pad(index + 1)} / ${pad(count)}`
}

/**
 * La posición de una tarjeta para el lector de pantalla: el nombre de cada tarjeta y lo que anuncia
 * la región viva después de tocar una flecha.
 *
 * @param index - Posición, desde 0.
 * @param count - Cantidad de tarjetas.
 * @returns Por ejemplo "3 de 7".
 * @throws {RangeError} Si `count` no es un entero desde 1 o `index` no es una posición válida.
 */
export function positionLabel(index: number, count: number): string {
  assertPosition(index, count)
  return `${String(index + 1)} ${UI_COPY.positionOf} ${String(count)}`
}

/** Medidas de la fila para {@link indexAtScroll}, en px. */
export interface CarouselScroll {
  /** `scrollLeft` de la fila. */
  scrollLeft: number
  /** El `scrollLeft` más grande posible (`scrollWidth - clientWidth`). */
  maxScrollLeft: number
  /** El `scrollLeft` que deja cada tarjeta al comienzo de la fila, en orden. */
  starts: readonly number[]
}

/**
 * Qué tarjeta quedó al comienzo de la fila: la de comienzo más cercano al `scrollLeft`. Al final
 * de la fila las últimas tarjetas ya no pueden llegar al comienzo; ahí se respeta la actual si una
 * flecha pasó a una de ellas, para que el contador no vuelva atrás.
 *
 * @param scroll - Ver {@link CarouselScroll}.
 * @param current - Índice de la tarjeta actual, desde 0.
 * @returns El índice de la tarjeta, de 0 a `starts.length - 1`.
 * @throws {RangeError} Si no hay tarjetas, alguna medida no es finita o `current` no es válido.
 */
export function indexAtScroll(scroll: CarouselScroll, current: number): number {
  const { scrollLeft, maxScrollLeft, starts } = scroll
  assertPosition(current, starts.length)
  assertFinite('scrollLeft', scrollLeft)
  assertFinite('maxScrollLeft', maxScrollLeft)
  let nearest = 0
  starts.forEach((start, index) => {
    assertFinite('El comienzo de la tarjeta', start)
    if (Math.abs(start - scrollLeft) < Math.abs((starts[nearest] ?? 0) - scrollLeft)) {
      nearest = index
    }
  })
  return scrollLeft >= maxScrollLeft - 1 ? Math.max(nearest, current) : nearest
}
