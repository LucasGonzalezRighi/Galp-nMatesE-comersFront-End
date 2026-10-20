import type { ProductGroup } from './catalog'
import type { Pesos } from './money'
import { pesos } from './money'

/** Descuento del kit que viene cargado de entrada, en porcentaje. */
export const DEFAULT_KIT_DISCOUNT_PERCENT = 10

/** Máximo descuento del kit que se puede cargar, en porcentaje. */
export const MAX_KIT_DISCOUNT_PERCENT = 30

/** Grupos que componen un kit, en el orden en que se eligen. */
export const KIT_GROUP_ORDER: readonly ProductGroup[] = ['mate', 'bombilla', 'yerba']

/**
 * Calcula el ahorro de un kit.
 *
 * Es el porcentaje de la suma de las tres piezas a precio de lista, redondeado al
 * peso más cercano (la mitad hacia arriba). El ahorro es de **un** kit: para varios
 * kits se multiplica por la cantidad.
 *
 * @param piecesListTotal - Suma de los precios de lista de las tres piezas.
 * @param discountPercent - Porcentaje de descuento, entero entre 0 y {@link MAX_KIT_DISCOUNT_PERCENT}.
 * @returns El ahorro en pesos.
 * @throws {RangeError} Si el porcentaje no es un entero entre 0 y 30.
 * @example
 * kitSavings(pesos(75997), 10) // 7600
 */
export function kitSavings(piecesListTotal: Pesos, discountPercent: number): Pesos {
  if (
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > MAX_KIT_DISCOUNT_PERCENT
  ) {
    throw new RangeError(
      `El descuento del kit tiene que ser un entero entre 0 y ${String(MAX_KIT_DISCOUNT_PERCENT)}; se recibió ${String(discountPercent)}.`,
    )
  }
  return pesos(Math.round((piecesListTotal * discountPercent) / 100))
}

/**
 * Lista los grupos que todavía no tienen pieza elegida en el kit.
 *
 * @param selection - Id de la pieza elegida por grupo; los grupos sin elegir faltan o son `undefined`.
 * @returns Los grupos que faltan, en el orden de {@link KIT_GROUP_ORDER}.
 * @example
 * missingKitGroups({ mate: 'm1' }) // ['bombilla', 'yerba']
 */
export function missingKitGroups(selection: Partial<Record<ProductGroup, string>>): ProductGroup[] {
  return KIT_GROUP_ORDER.filter((group) => selection[group] === undefined)
}

/**
 * Indica si el kit tiene las tres piezas elegidas.
 *
 * @param selection - Id de la pieza elegida por grupo.
 * @returns `true` si no falta ningún grupo.
 */
export function isKitComplete(selection: Partial<Record<ProductGroup, string>>): boolean {
  return missingKitGroups(selection).length === 0
}
