/**
 * Elige qué cuero se destaca en la última escena de la historia según el avance del scroll: el
 * recorrido se reparte en tramos iguales, uno por cuero, de izquierda a derecha.
 *
 * @param progress - Avance del scroll de 0 a 1; fuera de ese rango se recorta.
 * @param count - Cantidad de cueros, un entero mayor o igual a 1.
 * @returns La posición del cuero destacado, de 0 a `count - 1`.
 * @throws {RangeError} Si `progress` no es un número o `count` no es un entero mayor o igual a 1.
 * @example
 * leatherIndexForProgress(0.5, 4) // 2
 */
export function leatherIndexForProgress(progress: number, count: number): number {
  if (Number.isNaN(progress)) {
    throw new RangeError('El avance del scroll tiene que ser un número.')
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `La cantidad de cueros tiene que ser un entero mayor o igual a 1; se recibió ${String(count)}.`,
    )
  }
  const clamped = Math.min(1, Math.max(0, progress))
  return Math.min(count - 1, Math.floor(clamped * count))
}
