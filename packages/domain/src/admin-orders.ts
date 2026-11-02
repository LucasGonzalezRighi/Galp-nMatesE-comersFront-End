import type { OrderStatus, PaymentStatus } from './orders'
import { ORDER_STATUSES, PAYMENT_STATUSES } from './orders'

/** Estados a los que el administrador puede mover un pedido (el resto lo escribe el back). */
export const ADMIN_ORDER_TARGETS = [
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
] as const satisfies readonly OrderStatus[]

/** Estado al que el administrador puede mover un pedido. */
export type AdminOrderTarget = (typeof ADMIN_ORDER_TARGETS)[number]

/** Pagos con los que un pedido que espera el pago se puede cancelar: no hay plata en juego. */
export const CANCELLABLE_PAYMENT_STATUSES = [
  'none',
  'rejected',
  'cancelled',
] as const satisfies readonly PaymentStatus[]

/** Pedidos que faltan despachar ("Para despachar" del admin y `ordersToShip` del resumen). */
export const ORDERS_TO_SHIP_STATUSES = [
  'paid',
  'preparing',
] as const satisfies readonly OrderStatus[]

/** Pedidos que cuentan como vendidos en las cifras del resumen. */
export const SOLD_ORDER_STATUSES = [
  'paid',
  'preparing',
  'shipped',
  'delivered',
] as const satisfies readonly OrderStatus[]

/** Pagos en curso: mientras dure uno, el pedido no se puede cancelar. */
const PAYMENT_IN_PROGRESS_STATUSES = [
  'pending',
  'action_required',
] as const satisfies readonly PaymentStatus[]

/** Destinos de cada estado que no espera el pago (refinamiento 7 del plan de P4). */
const TARGETS_BY_STATUS: Record<OrderStatus, readonly AdminOrderTarget[]> = {
  pending_payment: [],
  paid: ['preparing', 'shipped'],
  preparing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  expired: [],
  refunded: [],
}

/** Resultado de revisar un cambio de estado: `ok` o el `type` del `409` que respondería el back. */
export type OrderTransitionCheck = 'ok' | 'invalid_status_transition' | 'payment_in_progress'

/**
 * Indica si un valor está en una lista de constantes, sin perder el tipo de la lista.
 *
 * @param list - Lista de valores posibles.
 * @param value - Valor a buscar.
 * @returns `true` si el valor está en la lista.
 */
function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value)
}

/**
 * Revisa que el estado del pedido y el del pago existan.
 *
 * @throws {RangeError} Si alguno de los dos no es un estado conocido.
 */
function assertStatuses(status: OrderStatus, paymentStatus: PaymentStatus): void {
  if (!isOneOf(ORDER_STATUSES, status)) {
    throw new RangeError(`Estado de pedido desconocido: "${String(status)}".`)
  }
  if (!isOneOf(PAYMENT_STATUSES, paymentStatus)) {
    throw new RangeError(`Estado de pago desconocido: "${String(paymentStatus)}".`)
  }
}

/**
 * Destinos que el admin ofrece para un pedido (refinamiento 7 del plan de P4).
 *
 * - `paid` → `preparing` o `shipped`; `preparing` → `shipped`; `shipped` → `delivered`.
 * - `pending_payment` → `cancelled`, solo si el pago es uno de {@link CANCELLABLE_PAYMENT_STATUSES}
 *   (con un pago en curso no se ofrece nada).
 * - `delivered`, `cancelled`, `expired` y `refunded` no tienen destinos.
 *
 * @param status - Estado actual del pedido.
 * @param paymentStatus - Estado actual del pago.
 * @returns Una lista nueva con los destinos, en el orden de {@link ADMIN_ORDER_TARGETS}.
 * @throws {RangeError} Si el estado del pedido o el del pago no existen.
 * @example
 * adminOrderTargets('paid', 'approved') // ['preparing', 'shipped']
 * adminOrderTargets('pending_payment', 'pending') // []
 */
export function adminOrderTargets(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): AdminOrderTarget[] {
  assertStatuses(status, paymentStatus)
  if (status === 'pending_payment') {
    return isOneOf(CANCELLABLE_PAYMENT_STATUSES, paymentStatus) ? ['cancelled'] : []
  }
  return [...TARGETS_BY_STATUS[status]]
}

/**
 * Revisa si un pedido puede pasar a `target`, con la misma regla que aplica el back.
 *
 * @param status - Estado actual del pedido.
 * @param paymentStatus - Estado actual del pago.
 * @param target - Estado al que se lo quiere mover.
 * @returns `ok` si es uno de {@link adminOrderTargets}; `payment_in_progress` si se pide cancelar un
 *   pedido que espera el pago con un pago `pending` o `action_required`; si no,
 *   `invalid_status_transition`.
 * @throws {RangeError} Si el estado del pedido, el del pago o el destino no existen.
 * @example
 * checkOrderTransition('paid', 'approved', 'cancelled') // 'invalid_status_transition'
 * checkOrderTransition('pending_payment', 'action_required', 'cancelled') // 'payment_in_progress'
 */
export function checkOrderTransition(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  target: AdminOrderTarget,
): OrderTransitionCheck {
  if (!isOneOf(ADMIN_ORDER_TARGETS, target)) {
    throw new RangeError(`Destino de pedido desconocido: "${String(target)}".`)
  }
  if (adminOrderTargets(status, paymentStatus).includes(target)) return 'ok'
  if (
    status === 'pending_payment' &&
    target === 'cancelled' &&
    isOneOf(PAYMENT_IN_PROGRESS_STATUSES, paymentStatus)
  ) {
    return 'payment_in_progress'
  }
  return 'invalid_status_transition'
}
