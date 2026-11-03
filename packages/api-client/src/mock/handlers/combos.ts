import type { MockRoute } from '../router'
import type { MockCombo, MockDb } from '../types'
import { json } from '../http'
import { toCombo } from '../mappers'
import { route } from '../router'

/**
 * Indica si un combo está a la venta en la tienda: publicado y con todas sus piezas publicadas y
 * con precio. El stock no cuenta: un combo con una pieza agotada se muestra "Sin stock".
 *
 * @param combo - Combo de la base.
 * @param db - Base simulada.
 */
export function isComboForSale(combo: MockCombo, db: MockDb): boolean {
  return (
    combo.status === 'published' &&
    combo.productIds.every((id) => {
      const product = db.products.find((candidate) => candidate.id === id)
      return product?.status === 'published' && product.priceArs !== null
    })
  )
}

/** Ruta pública de los combos: los que están a la venta, por posición. */
export const combosRoutes: readonly MockRoute[] = [
  route('GET', '/combos', ({ db, now }) =>
    json(
      db.combos
        .filter((combo) => isComboForSale(combo, db))
        .sort((a, b) => a.position - b.position)
        .map((combo) => toCombo(combo, db, now)),
    ),
  ),
]
