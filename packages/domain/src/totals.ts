import type { Pesos } from './money'
import { assertValidQuantity } from './catalog'
import { kitSavings } from './kit'
import { pesos, sumPesos } from './money'

/** Importes de una línea del carrito: precio de lista, ahorro y lo que se paga. */
export interface LineAmounts {
  /** Precio de lista de la línea (unidades × precio de lista). */
  grossArs: Pesos
  /** Ahorro por kit de la línea; 0 en los productos sueltos. */
  savingsArs: Pesos
  /** Importe de la línea: bruto menos ahorro. */
  totalArs: Pesos
}

/** Totales del carrito y del pedido. */
export interface CartTotals {
  /** Suma de los precios de lista de todas las líneas. */
  itemsGrossArs: Pesos
  /** Suma de los ahorros por kit. */
  kitSavingsArs: Pesos
  /** Bruto menos ahorro: es el "Subtotal" que muestra el diseño. */
  subtotalArs: Pesos
  /** Costo de envío; `null` si todavía no se eligió método. */
  shippingArs: Pesos | null
  /** Subtotal más envío (sin envío calculado, es el subtotal). */
  totalArs: Pesos
}

/**
 * Calcula los importes de una línea de producto suelto.
 *
 * @param unitPriceArs - Precio de lista por unidad.
 * @param quantity - Unidades, un entero mayor o igual a 1.
 * @returns Bruto y total iguales, sin ahorro.
 * @throws {RangeError} Si la cantidad no es un entero mayor o igual a 1.
 */
export function productLineAmounts(unitPriceArs: Pesos, quantity: number): LineAmounts {
  assertValidQuantity(quantity)
  const grossArs = pesos(unitPriceArs * quantity)
  return { grossArs, savingsArs: pesos(0), totalArs: grossArs }
}

/**
 * Calcula los importes de una línea de kit.
 *
 * El ahorro se calcula **por kit** (con {@link kitSavings}) y después se multiplica
 * por la cantidad, así el redondeo es el mismo que ve el cliente en un solo kit.
 *
 * @param pieceListPrices - Precios de lista del mate, la bombilla y la yerba del kit.
 * @param quantity - Cantidad de kits, un entero mayor o igual a 1.
 * @param discountPercent - Porcentaje de descuento del kit; el rango válido es el que exige {@link kitSavings}.
 * @returns Bruto, ahorro y total de la línea.
 * @throws {RangeError} Si la cantidad no es un entero mayor o igual a 1, o si el porcentaje no es
 *   un entero dentro del rango que exige {@link kitSavings}.
 * @example
 * kitLineAmounts([pesos(39999), pesos(25999), pesos(9999)], 1, 10)
 * // { grossArs: 75997, savingsArs: 7600, totalArs: 68397 }
 */
export function kitLineAmounts(
  pieceListPrices: readonly [Pesos, Pesos, Pesos],
  quantity: number,
  discountPercent: number,
): LineAmounts {
  assertValidQuantity(quantity)
  const kitGrossArs = sumPesos(pieceListPrices)
  const grossArs = pesos(kitGrossArs * quantity)
  const savingsArs = pesos(kitSavings(kitGrossArs, discountPercent) * quantity)
  return { grossArs, savingsArs, totalArs: pesos(grossArs - savingsArs) }
}

/**
 * Calcula los totales del carrito (o del pedido) a partir de los importes de sus líneas.
 *
 * @param lines - Importes de cada línea.
 * @param shippingArs - Costo de envío, o `null` si todavía no se eligió método.
 * @returns Bruto, ahorro por kits, subtotal, envío y total.
 */
export function cartTotals(lines: readonly LineAmounts[], shippingArs: Pesos | null): CartTotals {
  const itemsGrossArs = sumPesos(lines.map((line) => line.grossArs))
  const kitSavingsArs = sumPesos(lines.map((line) => line.savingsArs))
  const subtotalArs = pesos(itemsGrossArs - kitSavingsArs)
  return {
    itemsGrossArs,
    kitSavingsArs,
    subtotalArs,
    shippingArs,
    totalArs: sumPesos([subtotalArs, shippingArs ?? pesos(0)]),
  }
}
