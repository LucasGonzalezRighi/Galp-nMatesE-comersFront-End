import type { Combo } from '@galpon/api-client'
import { COMBO_MIN_ITEMS } from '@galpon/domain'

/**
 * Un aviso de la fila de un combo:
 *
 * - `unavailable`: una pieza ya no se vende (no está publicada, no tiene precio o no existe). La
 *   tienda no muestra el combo y el servidor no lo deja guardar hasta cambiar esa pieza.
 * - `soldOut`: una pieza se quedó sin stock. La tienda lo muestra "Sin stock".
 * - `noSavings`: las piezas ya suman lo mismo o menos que el combo (bajó alguna).
 */
export type ComboWarning = 'unavailable' | 'soldOut' | 'noSavings'

/**
 * Avisos de un combo para la fila del dashboard, con los datos vigentes de sus piezas que trae
 * la API. Valen también para los borradores: avisan lo que pasaría al publicarlos.
 *
 * Una pieza sin stock no se puede comprar y además tiene tope 0: eso es `soldOut`. Una pieza que
 * no se puede comprar con stock, sin precio, o una pieza que falta, es `unavailable`.
 *
 * @param combo - El combo, como lo devuelve `GET /admin/combos`.
 * @returns Los avisos, en el orden `unavailable`, `soldOut`, `noSavings` (vacío si no hay).
 */
export function comboWarnings(combo: Combo): ComboWarning[] {
  const warnings: ComboWarning[] = []
  const unavailable =
    combo.items.length < COMBO_MIN_ITEMS ||
    combo.items.some(
      (item) => item.unitPriceArs === null || (!item.isPurchasable && item.maxQuantity > 0),
    )
  if (unavailable) warnings.push('unavailable')
  if (combo.isSoldOut) warnings.push('soldOut')
  if (combo.savingsArs === 0) warnings.push('noSavings')
  return warnings
}
