import type { CartNotice } from './reconcile'
import {
  CART_COPY,
  itemsRemovedNotice,
  kitDiscountChangedNotice,
  moreChangesSuffix,
  priceChangedNotice,
  quantityReducedNotice,
} from './cart.copy'

/** Texto de un solo cambio, en una línea. */
function describeNotice(notice: CartNotice): string {
  switch (notice.kind) {
    case 'removed':
      return itemsRemovedNotice(notice.count)
    case 'reduced':
      return quantityReducedNotice(notice.name, notice.quantity)
    case 'price-changed':
      return priceChangedNotice(notice.name)
    case 'kit-discount-changed':
      return kitDiscountChangedNotice(notice.percent)
  }
}

/**
 * Arma el aviso que se le muestra al cliente cuando la conciliación cambió algo del carrito.
 *
 * Con un solo cambio, el subtítulo lo cuenta; con varios, cuenta el primero y suma cuántos más
 * hubo, porque el aviso es de una línea y dura poco.
 *
 * @param notices - Cambios que devolvió `reconcileCart`.
 * @returns El título y el subtítulo del aviso, o `null` si no hay nada que contar.
 */
export function describeCartNotices(
  notices: readonly CartNotice[],
): { title: string; subtitle: string } | null {
  const [first, ...rest] = notices
  if (first === undefined) return null
  const more = rest.length === 0 ? '' : moreChangesSuffix(rest.length)
  return { title: CART_COPY.updated, subtitle: `${describeNotice(first)}${more}` }
}
