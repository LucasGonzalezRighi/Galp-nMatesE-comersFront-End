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
