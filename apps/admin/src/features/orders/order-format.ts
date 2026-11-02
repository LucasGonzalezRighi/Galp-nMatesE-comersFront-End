import type { OrderPayment, ShippingAddress } from '@galpon/api-client'
import { formatDateTime, formatPesos, pesos } from '@galpon/domain'
import { MERCADO_PAGO_PAYMENT_URL } from './orders.constants'
import { PAYMENT_METHOD_TEXT, PAYMENT_TYPE_TEXT, STATUS_DETAIL_TEXT } from './orders.copy'

/** Detalle del pago listo para mostrar. */
export interface StatusDetailText {
  /** El texto traducido o, si no se conoce, el código tal cual. */
  text: string
  /** `true` si es un código sin traducir (va en `font-mono`). */
  isCode: boolean
}

/**
 * Formatea un monto en pesos enteros, por ejemplo "$46.499".
 *
 * @param value - Monto del contrato (`Pesos` o `TotalArs`).
 * @returns El monto formateado con `formatPesos`.
 * @throws {RangeError} Si no es un entero de pesos mayor o igual a 0.
 */
export function formatMoney(value: number): string {
  return formatPesos(pesos(value))
}

/**
 * Hora de Buenos Aires de una fecha, por ejemplo "12:20".
 *
 * @param iso - Fecha ISO 8601 con hora y zona horaria.
 * @returns La hora y los minutos de `formatDateTime`.
 * @throws {RangeError} Si la fecha no es válida.
 */
export function formatTimeOfDay(iso: string): string {
  return formatDateTime(iso).slice(-5)
}

/**
 * Líneas de la dirección de envío: calle, número y depto, y después código postal, ciudad y
 * provincia. Una sucursal (sin calle) tiene solo la segunda.
 *
 * @param address - Dirección del envío del pedido.
 * @returns Las líneas, listas para mostrar.
 * @example
 * formatOrderAddress({ city: 'Córdoba', postalCode: 'X5000', province: 'Córdoba' })
 * // ["X5000 Córdoba, Córdoba"]
 */
export function formatOrderAddress(address: ShippingAddress): string[] {
  const place = `${address.postalCode} ${address.city}, ${address.province}`
  if (!('street' in address)) return [place]
  const street = `${address.street} ${address.number}`
  return [address.apartment === null ? street : `${street}, ${address.apartment}`, place]
}

/**
 * Traduce el detalle del pago que informa Mercado Pago.
 *
 * @param statusDetail - Código, por ejemplo `accredited`.
 * @returns El texto traducido, o el código tal cual si no se conoce.
 * @throws {RangeError} Si el código está vacío.
 */
export function statusDetailText(statusDetail: string): StatusDetailText {
  if (statusDetail.trim() === '') {
    throw new RangeError('El detalle del pago no puede estar vacío.')
  }
  const text = STATUS_DETAIL_TEXT[statusDetail]
  return text === undefined ? { text: statusDetail, isCode: true } : { text, isCode: false }
}

/**
 * Medio de pago en palabras: "Mercado Pago" o "Tarjeta en la tienda", más el tipo de medio si se
 * conoce ("crédito", "débito" o "dinero en cuenta").
 *
 * @param payment - Datos del pago del pedido.
 * @returns Por ejemplo "Tarjeta en la tienda · crédito".
 */
export function paymentMethodText(payment: OrderPayment): string {
  const method = PAYMENT_METHOD_TEXT[payment.method]
  const type = payment.paymentTypeId === null ? undefined : PAYMENT_TYPE_TEXT[payment.paymentTypeId]
  return type === undefined ? method : `${method} · ${type}`
}

/**
 * Enlace al pago en Mercado Pago (ver {@link MERCADO_PAGO_PAYMENT_URL}).
 *
 * @param mpPaymentId - ID del pago en Mercado Pago.
 * @returns La dirección con el ID codificado.
 * @throws {RangeError} Si el ID está vacío.
 */
export function mercadoPagoPaymentUrl(mpPaymentId: string): string {
  if (mpPaymentId.trim() === '') {
    throw new RangeError('El ID del pago de Mercado Pago no puede estar vacío.')
  }
  return MERCADO_PAGO_PAYMENT_URL.replace('{id}', encodeURIComponent(mpPaymentId))
}
