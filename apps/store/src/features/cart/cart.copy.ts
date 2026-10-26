import { pluralize } from '@galpon/domain'

/** Microtextos del carrito, tal como están en el diseño y en el spec (9.4, 9.5 y 9.7). */
export const CART_COPY = {
  /** Título del panel y nombre del diálogo. */
  title: 'Carrito',
  /** Nombre accesible del botón del encabezado. */
  openCart: 'Abrir carrito',
  /** Nombre accesible del botón que cierra el panel. */
  closeCart: 'Cerrar carrito',
  /** Prefijo del nombre accesible del botón que quita una línea; lleva el nombre de la línea detrás. */
  removeLine: 'Quitar',
  /** Nombre de la línea de un kit. */
  kitName: 'Kit ronda completa',
  /** Prefijo del ahorro de la línea de un kit ("Ahorrás $7.900"). */
  youSave: 'Ahorrás',
  /** Etiqueta de una línea cuyo producto se quedó sin stock. */
  soldOut: 'Sin stock',
  /** Etiqueta de una línea cuyo producto ya no está a la venta (la cotización la marca `unavailable`). */
  unavailable: 'No disponible',
  /** Se agrega tras "Precio sin impuestos nacionales: $X" cuando la línea tiene más de una unidad: el importe es por unidad. */
  perUnit: 'c/u',
  /** Nombre de una línea cuyos datos todavía no llegaron. */
  loadingLine: 'Cargando…',
  /** Resumen: ahorro de los kits (informativo). */
  kitSavings: 'Ahorro por kit',
  /** Resumen: subtotal. */
  subtotal: 'Subtotal',
  /** Aclaración bajo el subtotal. */
  shippingNote: 'El envío se calcula en el checkout.',
  /** Botón que lleva al checkout. */
  checkout: 'Finalizar compra',
  /** Botón que cierra el panel. */
  keepShopping: 'Seguir comprando',
  /** Aviso cuando hay líneas sin stock o sin datos que impiden finalizar la compra. */
  blocked: 'Quitá los productos sin stock para finalizar la compra.',
  /** Carrito vacío: título. */
  emptyTitle: 'Tu carrito está vacío',
  /** Carrito vacío: texto. */
  emptyText: 'Elegí tu próximo compañero de ronda.',
  /** Carrito vacío: botón a la tienda. */
  emptyAction: 'Ir a la tienda',
  /** Botón de los avisos de agregado. */
  viewCart: 'Ver carrito',
  /** Aviso al agregar un producto. */
  added: 'Agregado al carrito',
  /** Aviso al agregar un kit. */
  kitAdded: 'Kit agregado al carrito',
  /** Aviso cuando ya no se puede sumar otra unidad. */
  limitReached: 'Ya tenés el máximo disponible',
  /** Aviso cuando ya no se puede sumar otro kit. */
  kitLimitReached: 'No hay stock para otro kit',
  /** Aviso cuando no se pudo conciliar el carrito con el catálogo (spec 9.7). */
  updateFailed: 'No pudimos actualizar el carrito',
  /** Título del aviso cuando la conciliación cambió algo del carrito. */
  updated: 'Actualizamos tu carrito',
} as const

/**
 * Subtítulo del aviso de un kit agregado.
 *
 * @param percent - Descuento del kit, entero.
 * @returns "Descuento de 10% aplicado".
 */
export function kitDiscountApplied(percent: number): string {
  return `Descuento de ${String(percent)}% aplicado`
}

/**
 * Aviso de que la conciliación quitó productos que ya no están disponibles.
 *
 * @param count - Cuántos productos se quitaron, entero desde 1.
 * @returns "Quitamos un producto que ya no está disponible" o "Quitamos 2 productos que ya no están disponibles".
 */
export function itemsRemovedNotice(count: number): string {
  return count === 1
    ? 'Quitamos un producto que ya no está disponible'
    : `Quitamos ${pluralize(count, 'producto', 'productos')} que ya no están disponibles`
}

/**
 * Aviso de que se bajó la cantidad de una línea por el stock.
 *
 * @param name - Nombre del producto.
 * @param quantity - Cantidad que quedó, entera.
 * @returns "Mate Galleta: bajamos la cantidad a 2 por el stock".
 */
export function quantityReducedNotice(name: string, quantity: number): string {
  return `${name}: bajamos la cantidad a ${String(quantity)} por el stock`
}

/**
 * Aviso de que cambió el precio de un producto del carrito.
 *
 * @param name - Nombre del producto.
 * @returns "Cambió el precio de Mate Galleta".
 */
export function priceChangedNotice(name: string): string {
  return `Cambió el precio de ${name}`
}

/**
 * Aviso de que cambió el descuento del kit.
 *
 * @param percent - Descuento nuevo, entero.
 * @returns "El descuento del kit ahora es de 15%".
 */
export function kitDiscountChangedNotice(percent: number): string {
  return `El descuento del kit ahora es de ${String(percent)}%`
}

/**
 * Cola del subtítulo del aviso cuando hubo más de un cambio.
 *
 * @param count - Cuántos cambios más hubo además del primero, entero desde 1.
 * @returns " · y 2 cambios más".
 */
export function moreChangesSuffix(count: number): string {
  return ` · y ${pluralize(count, 'cambio', 'cambios')} más`
}

/**
 * Detalle del cuero de un mate: se escribe en minúscula tras la palabra "Cuero".
 *
 * @param leather - Cuero elegido, por ejemplo "Negro".
 * @returns "Cuero negro".
 */
export function leatherLabel(leather: string): string {
  return `Cuero ${leather.toLowerCase()}`
}
