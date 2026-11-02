import type { Order } from '@galpon/api-client'
import { isOrderNumber, ORDER_STATUSES, PAYMENT_STATUSES } from '@galpon/domain'
import { DEFAULT_REJECTION_REASON, REJECTION_REASONS } from './result.copy'

/**
 * Pantalla que corresponde a un pedido (spec 14.2, Ruling P3-6):
 * - `approved`: pago aprobado.
 * - `pending`: pago en revisión, con el pedido esperando.
 * - `action_required`: falta la verificación 3-D Secure.
 * - `rejected`: pago rechazado; se puede probar con otro medio.
 * - `unpaid`: sin pago o con el intento cancelado, y el pedido todavía reservado.
 * - `expired`: el pedido venció (`status: expired`).
 * - `other`: cualquier otro estado (cancelado por la tienda, devuelto…), solo informativo.
 */
export type ResultKind =
  'approved' | 'pending' | 'action_required' | 'rejected' | 'unpaid' | 'expired' | 'other'

/** Cada cuánto se vuelve a consultar un pago pendiente, en milisegundos. */
export const PENDING_POLL_INTERVAL_MS = 5_000

/** Consultas de un pago pendiente antes de dejar de esperar: 24 de a 5 s son 2 minutos. */
export const PENDING_MAX_POLLS = 24

/**
 * Pantalla del resultado para un pedido. "El pedido venció" sale solo con `status: expired`; un
 * pago `none` o `cancelled` con el pedido todavía pendiente es "No completaste el pago".
 *
 * @param order - Estado del pedido y de su pago, como los devuelve `GET /orders/{number}`.
 * @returns La pantalla que corresponde.
 * @throws {RangeError} Si el estado del pedido o del pago no es uno del contrato.
 * @example
 * resultKind({ status: 'pending_payment', paymentStatus: 'cancelled' }) // "unpaid"
 */
export function resultKind(order: Pick<Order, 'status' | 'paymentStatus'>): ResultKind {
  if (!(ORDER_STATUSES as readonly string[]).includes(order.status)) {
    throw new RangeError(
      `status tiene que ser un estado de pedido del contrato, y recibió ${JSON.stringify(order.status)}`,
    )
  }
  if (!(PAYMENT_STATUSES as readonly string[]).includes(order.paymentStatus)) {
    throw new RangeError(
      `paymentStatus tiene que ser un estado de pago del contrato, y recibió ${JSON.stringify(order.paymentStatus)}`,
    )
  }
  if (order.status === 'expired') return 'expired'
  if (order.paymentStatus === 'approved') return 'approved'
  if (order.status !== 'pending_payment') return 'other'
  switch (order.paymentStatus) {
    case 'pending':
    case 'action_required':
    case 'rejected':
      return order.paymentStatus
    case 'none':
    case 'cancelled':
      return 'unpaid'
    default:
      return 'other'
  }
}

/**
 * Motivo legible en español de un rechazo de Mercado Pago.
 *
 * @param statusDetail - `payment.statusDetail` del pedido, o `null` si no vino.
 * @returns El motivo, o uno genérico si el detalle falta o no se conoce.
 * @example
 * rejectionReason('cc_rejected_insufficient_amount') // "La tarjeta no tiene fondos suficientes."
 */
export function rejectionReason(statusDetail: string | null): string {
  if (statusDetail === null) return DEFAULT_REJECTION_REASON
  return Object.hasOwn(REJECTION_REASONS, statusDetail)
    ? (REJECTION_REASONS[statusDetail] ?? DEFAULT_REJECTION_REASON)
    : DEFAULT_REJECTION_REASON
}

/**
 * Dirección del desafío 3-D Secure del simulador de Mercado Pago (modo de prueba), la misma que
 * devuelve la API simulada al pagar con el titular `3DS`. El pedido no guarda la del desafío,
 * así que en modo de prueba el resultado la arma para retomarlo.
 *
 * @param number - Número del pedido.
 * @returns `/checkout/mp-simulado?pedido=…&challenge=1`.
 * @throws {RangeError} Si el número no es `GLP-` y cinco dígitos.
 */
export function mercadoPagoSimulatorChallengeUrl(number: string): string {
  if (!isOrderNumber(number)) {
    throw new RangeError(
      `number tiene que ser un número de pedido (GLP- y cinco dígitos), y recibió ${JSON.stringify(number)}`,
    )
  }
  return `/checkout/mp-simulado?pedido=${encodeURIComponent(number)}&challenge=1`
}

/**
 * Si una dirección es una ruta de la tienda (empieza con `/`, sin `//` ni `/\`), para no navegar
 * a otro sitio con una dirección que llega de afuera.
 *
 * @param path - Dirección a revisar.
 * @returns `true` si es una ruta interna.
 */
export function isInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
}
