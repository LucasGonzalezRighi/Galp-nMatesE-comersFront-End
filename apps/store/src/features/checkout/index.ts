/**
 * Checkout de la tienda (spec 14): los tres pasos (contacto, envío y pago), el pedido en curso
 * de la pestaña (`order-session`) y, en `./result`, el resultado del pago, el simulador de
 * Mercado Pago del modo de prueba y el seguimiento del pedido de invitado.
 *
 * El cliente de la API del navegador lee el token del pedido con `readOrderToken` y lo manda en
 * `X-Order-Token`.
 *
 * @packageDocumentation
 */
export type { OrderSession } from './order-session'
export {
  clearOrderSession,
  ORDER_SESSION_KEY,
  readOrderSession,
  readOrderToken,
  saveOrderSession,
} from './order-session'
export * from './result'
