import type { ProductGroup } from './catalog'
import type { Pesos } from './money'
import type { Leather } from './options'
import type { LineAmounts } from './totals'
import { assertValidQuantity } from './catalog'
import { pesos, sumPesos } from './money'

/** Mínimo de productos de un combo. */
export const COMBO_MIN_ITEMS = 2

/** Máximo de productos de un combo: uno por grupo (mate, bombilla y yerba). */
export const COMBO_MAX_ITEMS = 3

/** Estados de un combo: borrador (la tienda no lo ve) o publicado. */
export const COMBO_STATUSES = ['draft', 'published'] as const

/** Estado de un combo. */
export type ComboStatus = (typeof COMBO_STATUSES)[number]

/**
 * Calcula el ahorro de un combo frente a comprar sus piezas sueltas.
 *
 * @param listPriceArs - Suma de los precios de lista vigentes de las piezas.
 * @param comboPriceArs - Precio final del combo.
 * @returns `max(0, lista − precio)`: si las piezas ya suman menos que el combo, no hay ahorro.
 * @example
 * comboSavings(pesos(68998), pesos(61999)) // 6999
 */
export function comboSavings(listPriceArs: Pesos, comboPriceArs: Pesos): Pesos {
  return pesos(Math.max(0, listPriceArs - comboPriceArs))
}

/**
 * Calcula los importes de una línea de combo.
 *
 * El precio de lista por combo es el mayor entre la suma de las piezas y el precio del combo, así
 * el ahorro nunca es negativo: si las piezas bajan de precio y suman menos que el combo, se cobra
 * el combo sin ahorro. Siempre se cobra `precio × cantidad` y `total = bruto − ahorro`.
 *
 * @param piecePrices - Precios de lista vigentes de las piezas, de 2 a 3.
 * @param comboPriceArs - Precio final del combo, mayor a 0.
 * @param quantity - Cantidad de combos, un entero mayor o igual a 1.
 * @returns Bruto (`max(suma, precio) × cantidad`), ahorro y total (`precio × cantidad`).
 * @throws {RangeError} Si no hay de 2 a 3 piezas, si el precio es 0 o si la cantidad no es un
 *   entero mayor o igual a 1.
 * @example
 * comboLineAmounts([pesos(39999), pesos(28999)], pesos(61999), 2)
 * // { grossArs: 137996, savingsArs: 13998, totalArs: 123998 }
 */
export function comboLineAmounts(
  piecePrices: readonly Pesos[],
  comboPriceArs: Pesos,
  quantity: number,
): LineAmounts {
  if (piecePrices.length < COMBO_MIN_ITEMS || piecePrices.length > COMBO_MAX_ITEMS) {
    throw new RangeError(
      `Un combo lleva de ${String(COMBO_MIN_ITEMS)} a ${String(COMBO_MAX_ITEMS)} productos; se recibieron ${String(piecePrices.length)}.`,
    )
  }
  if (comboPriceArs <= 0) {
    throw new RangeError(
      `El precio del combo tiene que ser mayor a 0; se recibió ${String(comboPriceArs)}.`,
    )
  }
  assertValidQuantity(quantity)
  const listPriceArs = sumPesos(piecePrices)
  const unitPriceArs = pesos(Math.max(listPriceArs, comboPriceArs))
  return {
    grossArs: pesos(unitPriceArs * quantity),
    savingsArs: pesos(comboSavings(listPriceArs, comboPriceArs) * quantity),
    totalArs: pesos(comboPriceArs * quantity),
  }
}

/**
 * Indica si los productos de un combo son de grupos distintos (a lo sumo un mate, una bombilla y
 * una yerba), que es la regla para guardarlo: así cada combo tiene a lo sumo un cuero.
 *
 * @param groups - Grupo de cada producto del combo.
 * @returns `true` si ningún grupo se repite.
 * @example
 * hasDistinctGroups(['mate', 'bombilla']) // true
 * hasDistinctGroups(['yerba', 'yerba']) // false
 */
export function hasDistinctGroups(groups: readonly ProductGroup[]): boolean {
  return new Set(groups).size === groups.length
}

/**
 * Indica si el combo lleva un mate. El cliente elige cuero solo si ese mate ofrece cueros (ver
 * {@link comboMateLeathers}).
 *
 * @param groups - Grupo de cada producto del combo.
 * @returns `true` si alguna pieza es un mate.
 */
export function comboHasMate(groups: readonly ProductGroup[]): boolean {
  return groups.includes('mate')
}

/**
 * Devuelve los cueros que se pueden elegir en un combo: los del mate, si lleva uno.
 *
 * @param items - Piezas del combo, con su grupo y sus cueros.
 * @returns Una copia de los `leathers` del mate; `[]` si el combo no lleva mate o el mate no
 *   ofrece cueros.
 * @example
 * comboMateLeathers([{ group: 'mate', leathers: ['Negro'] }, { group: 'yerba', leathers: [] }]) // ["Negro"]
 */
export function comboMateLeathers(
  items: readonly { group: ProductGroup; leathers: readonly Leather[] }[],
): Leather[] {
  return [...(items.find((item) => item.group === 'mate')?.leathers ?? [])]
}
