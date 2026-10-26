import type { ApiClient } from '../client'
import type {
  CartQuote,
  CartQuoteInput,
  ShippingQuote,
  ShippingQuoteInput,
} from '../generated/schema'
import { unwrap } from '../unwrap'

/**
 * Cotiza el carrito: importes, ahorro por kit, precio sin impuestos y problemas de cada línea.
 * Es la fuente de verdad de los importes; no reserva stock.
 *
 * @param api - Cliente de la API.
 * @param input - Líneas del carrito.
 * @throws {ApiError} Si la llamada falla (`validation` si alguna línea no es válida).
 */
export function quoteCart(api: ApiClient, input: CartQuoteInput): Promise<CartQuote> {
  return unwrap(api.POST('/cart/quote', { body: input }))
}

/**
 * Cotiza el envío de un método para un código postal.
 *
 * @param api - Cliente de la API.
 * @param input - Método, código postal (`null` en el retiro) y líneas del carrito.
 * @throws {ApiError} Si la llamada falla (`validation` si el método no está disponible).
 */
export function quoteShipping(api: ApiClient, input: ShippingQuoteInput): Promise<ShippingQuote> {
  return unwrap(api.POST('/shipping/quote', { body: input }))
}
