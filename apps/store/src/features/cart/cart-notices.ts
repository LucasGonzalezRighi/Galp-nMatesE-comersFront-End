import { pluralize } from '@galpon/domain'
import type { CartNotice } from './reconcile'
import { CART_COPY } from './cart.copy'

/** Texto de un solo cambio, en una línea. */
function describeNotice(notice: CartNotice): string {
  switch (notice.kind) {
    case 'removed':
      return notice.count === 1
        ? 'Quitamos un producto que ya no está disponible'
        : `Quitamos ${pluralize(notice.count, 'producto', 'productos')} que ya no están disponibles`
    case 'reduced':
      return `${notice.name}: bajamos la cantidad a ${String(notice.quantity)} por el stock`
    case 'price-changed':
      return `Cambió el precio de ${notice.name}`
    case 'kit-discount-changed':
      return `El descuento del kit ahora es de ${String(notice.percent)}%`
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
  const more = rest.length === 0 ? '' : ` · y ${pluralize(rest.length, 'cambio', 'cambios')} más`
  return { title: CART_COPY.updated, subtitle: `${describeNotice(first)}${more}` }
}
