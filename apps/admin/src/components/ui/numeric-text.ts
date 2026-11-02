/** Cifras como máximo, para quedar dentro de `Number.MAX_SAFE_INTEGER` (16 cifras). */
const MAX_DIGITS = 15

/** Todo lo que no es cifra. */
const NON_DIGITS = /\D/g

/** Lo que se descarta de un monto al escribir: todo menos cifras, puntos y el signo pesos. */
const NOT_MONEY_CHARS = /[^\d.$]/g

/** Lo que se descarta de un número al escribir: todo menos cifras, puntos y comas. */
const NOT_NUMBER_CHARS = /[^\d.,]/g

/** Lo que va antes de la primera coma: la parte entera en el formato de Argentina. */
function beforeComma(text: string): string {
  const comma = text.indexOf(',')
  return comma === -1 ? text : text.slice(0, comma)
}

/** Convierte cifras sueltas en un entero, o `null` si no hay ninguna. */
function digitsToInteger(text: string): number | null {
  const digits = text.replace(NON_DIGITS, '').slice(0, MAX_DIGITS)
  return digits === '' ? null : Number(digits)
}

/**
 * Limpia lo que se escribe en un campo de monto: quedan las cifras, los puntos de miles y el
 * signo pesos; las letras y los espacios se ignoran y lo que sigue a una coma (los centavos) se
 * descarta, porque los montos son pesos enteros.
 *
 * @param text - Lo que hay en el campo.
 * @returns El texto que se muestra mientras se edita.
 * @example
 * sanitizeMoneyText('$39.999,50') // "$39.999"
 */
export function sanitizeMoneyText(text: string): string {
  return beforeComma(text).replace(NOT_MONEY_CHARS, '')
}

/**
 * Lee un monto en pesos enteros escrito como "39999", "39.999" o "$39.999".
 *
 * @param text - Lo que hay en el campo.
 * @returns El monto, o `null` si no hay cifras. Nunca tiene decimales.
 * @example
 * parseMoneyText('$39.999') // 39999
 * parseMoneyText('') // null
 */
export function parseMoneyText(text: string): number | null {
  return digitsToInteger(sanitizeMoneyText(text))
}

/**
 * Limpia lo que se escribe en un campo numérico. Los puntos de miles se conservan y se ignoran
 * al leer. Sin decimales, lo que sigue a una coma se descarta; con decimales, queda solo la
 * primera coma.
 *
 * @param text - Lo que hay en el campo.
 * @param allowDecimal - Si acepta una coma decimal.
 * @returns El texto que se muestra mientras se edita.
 * @example
 * sanitizeNumberText('10,5', true) // "10,5"
 * sanitizeNumberText('10,5', false) // "10"
 */
export function sanitizeNumberText(text: string, allowDecimal: boolean): string {
  if (!allowDecimal) return beforeComma(text).replace(NON_DIGITS, '')
  const clean = text.replace(NOT_NUMBER_CHARS, '')
  const comma = clean.indexOf(',')
  if (comma === -1) return clean
  return `${clean.slice(0, comma + 1)}${clean.slice(comma + 1).replace(/,/g, '')}`
}

/**
 * Lee un número escrito con el formato de Argentina: punto de miles y coma decimal.
 *
 * @param text - Lo que hay en el campo.
 * @param allowDecimal - Si acepta una coma decimal; si no, lo que sigue a la coma se descarta.
 * @returns El número, o `null` si no hay cifras.
 * @example
 * parseNumberText('1.234,5', true) // 1234.5
 * parseNumberText('10,5', false) // 10
 */
export function parseNumberText(text: string, allowDecimal: boolean): number | null {
  const clean = sanitizeNumberText(text, allowDecimal)
  const comma = clean.indexOf(',')
  if (comma === -1) return digitsToInteger(clean)
  const integer = clean.slice(0, comma).replace(NON_DIGITS, '').slice(0, MAX_DIGITS)
  const decimals = clean.slice(comma + 1).replace(NON_DIGITS, '')
  if (integer === '' && decimals === '') return null
  return Number(`${integer === '' ? '0' : integer}.${decimals === '' ? '0' : decimals}`)
}

/**
 * Muestra un número con coma decimal y sin puntos de miles, como se escribe en el campo.
 *
 * @param value - El número.
 * @returns El texto, por ejemplo "10,5".
 * @throws {RangeError} Si `value` no es un número finito.
 * @example
 * formatNumberText(10.5) // "10,5"
 */
export function formatNumberText(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`El número tiene que ser finito; se recibió ${String(value)}.`)
  }
  return String(value).replace('.', ',')
}
