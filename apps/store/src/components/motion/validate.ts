/**
 * Exige que un número de configuración sea finito y no negativo.
 *
 * @param name - Nombre de la propiedad, para el mensaje de error.
 * @param value - Valor recibido.
 * @throws {RangeError} Si `value` es negativo, `NaN` o infinito.
 */
export function assertNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${name} tiene que ser un número mayor o igual a 0; se recibió ${String(value)}.`,
    )
  }
}

/**
 * Exige que un número de configuración sea finito (puede ser negativo).
 *
 * @param name - Nombre de la propiedad, para el mensaje de error.
 * @param value - Valor recibido.
 * @throws {RangeError} Si `value` es `NaN` o infinito.
 */
export function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} tiene que ser un número finito; se recibió ${String(value)}.`)
  }
}

/**
 * Exige que un valor sea un entero dentro de un rango.
 *
 * @param name - Nombre de la propiedad, para el mensaje de error.
 * @param value - Valor recibido.
 * @param min - Mínimo permitido, inclusive.
 * @param max - Máximo permitido, inclusive.
 * @throws {RangeError} Si `value` no es un entero entre `min` y `max`.
 */
export function assertIntegerInRange(name: string, value: number, min: number, max: number): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(
      `${name} tiene que ser un entero de ${String(min)} a ${String(max)}; se recibió ${String(value)}.`,
    )
  }
}
