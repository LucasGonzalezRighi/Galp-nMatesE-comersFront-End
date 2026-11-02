import type { ApiClient } from '../client'
import type { CreateOrderInput, CreateOrderResult, Order } from '../generated/schema'
import { unwrap } from '../unwrap'
import { assertIdempotencyKey, assertOrderNumber } from './validation'

/**
 * Crea el pedido en `pending_payment` y reserva el stock 30 minutos, sin cobrar.
 *
 * Repetirla con la misma `idempotencyKey` (por ejemplo, un reintento de red) devuelve el mismo
 * pedido. Si cambió el total, un precio o el stock, falla con `conflict` y el detalle en
 * `problem.changes`: hay que mostrarlo y reintentar con una clave nueva.
 *
 * @param api - Cliente de la API.
 * @param input - Datos del checkout, con el total que vio el cliente.
 * @param idempotencyKey - UUID v4 generado una vez por intento.
 * @returns El pedido y su token, que se entrega solo esta vez.
 * @throws {RangeError} Si la clave no es un UUID.
 * @throws {ApiError} Si la llamada falla (`conflict` con `type` `stock_changed`, `price_changed`
 *   o `total_changed`; `validation` con el mensaje de cada campo).
 */
export async function createOrder(
  api: ApiClient,
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<CreateOrderResult> {
  assertIdempotencyKey(idempotencyKey)
  return unwrap(
    api.POST('/orders', {
      params: { header: { 'Idempotency-Key': idempotencyKey } },
      body: input,
    }),
  )
}

/**
 * Trae un pedido con el token de `getOrderToken` (cabecera `X-Order-Token`) o con la sesión del
 * cliente dueño.
 *
 * @param api - Cliente de la API.
 * @param number - Número del pedido.
 * @throws {RangeError} Si el número no es `GLP-` y cinco dígitos.
 * @throws {ApiError} Con `not_found` si no existe o el token falta o no corresponde.
 */
export async function getOrder(api: ApiClient, number: string): Promise<Order> {
  assertOrderNumber(number)
  return unwrap(api.GET('/orders/{number}', { params: { path: { number } } }))
}
