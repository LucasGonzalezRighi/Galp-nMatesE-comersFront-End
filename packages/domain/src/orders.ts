/** Estados de un pedido, en orden de ciclo de vida (los últimos son finales alternativos). */
export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'expired',
  'refunded',
] as const

/** Estado de un pedido. */
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Estados del pago de un pedido, según lo que informa Mercado Pago. */
export const PAYMENT_STATUSES = [
  'none',
  'pending',
  'action_required',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'partially_refunded',
  'in_dispute',
  'charged_back',
] as const

/** Estado del pago de un pedido. */
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/** Formas de pagar: redirigiendo a Mercado Pago o con tarjeta dentro de la tienda. */
export const PAYMENT_METHODS = ['mp_redirect', 'card'] as const

/** Forma de pago elegida en el checkout. */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** Formato del número de pedido: `GLP-` y cinco dígitos (por ejemplo `GLP-00042`). */
export const ORDER_NUMBER_PATTERN = /^GLP-\d{5}$/

/**
 * Indica si un texto es un número de pedido válido.
 *
 * @param v - Texto a revisar; se compara exacto, sin recortar espacios ni cambiar mayúsculas.
 * @returns `true` si cumple {@link ORDER_NUMBER_PATTERN}.
 * @example
 * isOrderNumber('GLP-12345') // true
 * isOrderNumber('glp-12345') // false
 */
export function isOrderNumber(v: string): boolean {
  return ORDER_NUMBER_PATTERN.test(v)
}

/** Minutos que se reserva el stock de un pedido mientras espera el pago. */
export const ORDER_RESERVATION_MINUTES = 30
