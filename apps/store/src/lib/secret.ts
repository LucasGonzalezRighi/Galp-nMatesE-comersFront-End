import { createHash, timingSafeEqual } from 'node:crypto'

/** SHA-256 del texto: dos huellas del mismo largo se pueden comparar en tiempo constante. */
function fingerprint(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/**
 * Compara un secreto recibido en una cabecera con el esperado, en tiempo constante y sin revelar el
 * largo del secreto.
 *
 * @param provided - Valor de la cabecera, o `null` si no vino.
 * @param expected - El secreto configurado.
 * @returns `true` solo si son iguales.
 * @throws {RangeError} Si `expected` está vacío: con un secreto vacío cualquiera pasaría.
 */
export function secretMatches(provided: string | null, expected: string): boolean {
  if (expected === '') {
    throw new RangeError('secretMatches necesita el secreto esperado (no puede ser vacío).')
  }
  if (provided === null) return false
  return timingSafeEqual(fingerprint(provided), fingerprint(expected))
}
