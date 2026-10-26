/**
 * Cantidad de reseñas en palabras, con el formato argentino: "1 reseña", "3 reseñas",
 * "1.234 reseñas". `pluralize` del dominio no agrupa los miles, así que el número se formatea acá.
 *
 * @param count - Cantidad de reseñas, un entero mayor o igual a 0.
 * @returns El número con separador de miles y la palabra en singular solo si es 1.
 * @throws {RangeError} Si la cantidad no es un entero mayor o igual a 0.
 * @example
 * formatReviewCount(1234) // "1.234 reseñas"
 */
export function formatReviewCount(count: number): string {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `La cantidad de reseñas tiene que ser un entero mayor o igual a 0; se recibió ${String(count)}.`,
    )
  }
  return `${count.toLocaleString('es-AR')} ${count === 1 ? 'reseña' : 'reseñas'}`
}
