import type { Pesos } from './money'
import { pesos } from './money'

/** Dos decimales con coma como separador decimal, sin signo para el cero negativo. */
const PERCENT_FORMAT = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'negative',
})

/**
 * Calcula el monto informativo de una cuota.
 *
 * Es solo para mostrar ("3 cuotas sin interés de $13.333"): el monto real lo define Mercado Pago.
 *
 * @param total - Precio o total a financiar.
 * @param count - Cantidad de cuotas, un entero mayor o igual a 1.
 * @returns El total dividido en `count`, redondeado al peso más cercano.
 * @throws {RangeError} Si la cantidad de cuotas no es un entero mayor o igual a 1.
 * @example
 * installmentAmount(pesos(39999), 3) // 13333
 */
export function installmentAmount(total: Pesos, count: number): Pesos {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `La cantidad de cuotas tiene que ser un entero mayor o igual a 1; se recibió ${String(count)}.`,
    )
  }
  return pesos(Math.round(total / count))
}

/**
 * Formatea un porcentaje como lo pide la leyenda de cuotas: dos decimales, coma decimal y un
 * espacio antes del `%`.
 *
 * @param value - Porcentaje, por ejemplo el CFT o la TEA.
 * @returns El porcentaje formateado; lo que redondea a cero (incluido `-0`) se muestra sin signo.
 * @throws {RangeError} Si el valor no es un número finito.
 * @example
 * formatPercentAr(45.9) // "45,90 %"
 */
export function formatPercentAr(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `El porcentaje tiene que ser un número finito; se recibió ${String(value)}.`,
    )
  }
  return `${PERCENT_FORMAT.format(value)} %`
}
