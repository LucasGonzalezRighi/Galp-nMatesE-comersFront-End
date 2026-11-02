import type { ApiClient } from '../client'
import type {
  CardPaymentInput,
  CardPaymentResult,
  InstallmentOption,
  InstallmentsInput,
  MercadoPagoPreference,
} from '../generated/schema'
import { unwrap, unwrapVoid } from '../unwrap'
import { assertIdempotencyKey, assertOrderNumber } from './validation'

/**
 * Crea la preferencia de Mercado Pago del pedido; el intento activo anterior se cancela.
 *
 * @param api - Cliente de la API (con `getOrderToken`).
 * @param number - Número del pedido.
 * @param idempotencyKey - UUID v4 del intento; repetido devuelve la misma preferencia.
 * @returns `initPoint`, adonde se redirige al cliente.
 * @throws {RangeError} Si el número o la clave no tienen formato.
 * @throws {ApiError} Si la llamada falla (`conflict` si el pedido ya está pagado o venció).
 */
export async function createMercadoPagoPreference(
  api: ApiClient,
  number: string,
  idempotencyKey: string,
): Promise<MercadoPagoPreference> {
  assertOrderNumber(number)
  assertIdempotencyKey(idempotencyKey)
  return unwrap(
    api.POST('/orders/{number}/payments/mercadopago/preference', {
      params: { path: { number }, header: { 'Idempotency-Key': idempotencyKey } },
    }),
  )
}

/**
 * Cobra el pedido con el token de tarjeta; el intento activo anterior se cancela.
 *
 * @param api - Cliente de la API (con `getOrderToken`).
 * @param number - Número del pedido.
 * @param input - Token de un solo uso, marca, cuotas y pagador.
 * @param idempotencyKey - UUID v4 del intento; repetido devuelve el primer resultado.
 * @returns El estado del pago en este momento y, si hace falta, el desafío 3-D Secure.
 * @throws {RangeError} Si el número o la clave no tienen formato.
 * @throws {ApiError} Si la llamada falla (`conflict` si el pedido ya está pagado o venció).
 */
export async function payWithCard(
  api: ApiClient,
  number: string,
  input: CardPaymentInput,
  idempotencyKey: string,
): Promise<CardPaymentResult> {
  assertOrderNumber(number)
  assertIdempotencyKey(idempotencyKey)
  return unwrap(
    api.POST('/orders/{number}/payments/mercadopago/card', {
      params: { path: { number }, header: { 'Idempotency-Key': idempotencyKey } },
      body: input,
    }),
  )
}

/**
 * Consulta las cuotas de una tarjeta sobre el total del pedido.
 *
 * @param api - Cliente de la API (con `getOrderToken`).
 * @param number - Número del pedido.
 * @param input - Primeros dígitos de la tarjeta y si es de crédito o débito.
 * @returns Las opciones, de menos a más cuotas; la primera es 1 pago.
 * @throws {RangeError} Si el número no tiene formato.
 * @throws {ApiError} Si la llamada falla (`conflict` si el pedido ya está pagado o venció).
 */
export async function getInstallments(
  api: ApiClient,
  number: string,
  input: InstallmentsInput,
): Promise<InstallmentOption[]> {
  assertOrderNumber(number)
  return unwrap(
    api.POST('/orders/{number}/payments/mercadopago/installments', {
      params: { path: { number } },
      body: input,
    }),
  )
}

/**
 * Cancela el intento de pago activo antes de probar con otro medio; sin intento activo no hace
 * nada. El pedido sigue esperando el pago con la misma reserva.
 *
 * @param api - Cliente de la API (con `getOrderToken`).
 * @param number - Número del pedido.
 * @throws {RangeError} Si el número no tiene formato.
 * @throws {ApiError} Si la llamada falla (`conflict` si el pedido ya está pagado o venció).
 */
export async function cancelPayment(api: ApiClient, number: string): Promise<void> {
  assertOrderNumber(number)
  return unwrapVoid(api.POST('/orders/{number}/cancel-payment', { params: { path: { number } } }))
}
