import type { Pesos } from './money'
import { pesos } from './money'

/**
 * Calcula el precio sin impuestos nacionales a partir del precio final con IVA incluido.
 *
 * Es informativo ("Precio sin impuestos nacionales: $X"): el back lo calcula con la misma fórmula.
 *
 * @param priceArs - Precio de venta al consumidor final, con impuestos.
 * @param vatRatePercent - Alícuota en porcentaje, de 0 a 100; admite decimales (10,5).
 * @returns El precio dividido por `1 + alícuota / 100`, redondeado al peso más cercano.
 * @throws {RangeError} Si la alícuota no es un número entre 0 y 100.
 * @example
 * netPrice(pesos(12100), 21) // 10000
 */
export function netPrice(priceArs: Pesos, vatRatePercent: number): Pesos {
  if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
    throw new RangeError(
      `La alícuota tiene que ser un número entre 0 y 100; se recibió ${String(vatRatePercent)}.`,
    )
  }
  return pesos(Math.round(priceArs / (1 + vatRatePercent / 100)))
}

/** CUIT con guiones (`20-12345678-6`) o solo con los 11 dígitos. */
const CUIT_PATTERN = /^(?:\d{11}|\d{2}-\d{8}-\d)$/

/**
 * Formatea un CUIT con sus guiones, para mostrarlo. No revisa el dígito verificador: eso lo hace
 * `cuitSchema` de `@galpon/schemas` al guardarlo.
 *
 * @param cuit - Los 11 dígitos, con o sin guiones.
 * @returns El CUIT como `NN-NNNNNNNN-N`.
 * @throws {RangeError} Si no son 11 dígitos, con o sin los guiones en su lugar.
 * @example
 * formatCuit('20123456786') // "20-12345678-6"
 */
export function formatCuit(cuit: string): string {
  if (!CUIT_PATTERN.test(cuit)) {
    throw new RangeError(
      `El CUIT tiene que tener 11 dígitos, con o sin guiones; se recibió "${cuit}".`,
    )
  }
  const digits = cuit.replace(/-/g, '')
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}
