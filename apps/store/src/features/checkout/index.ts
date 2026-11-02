/**
 * Checkout de la tienda (spec 14): los tres pasos (contacto, envío y pago), el pedido en curso
 * de la pestaña (`order-session`) y, en `./result`, el resultado del pago, el simulador de
 * Mercado Pago del modo de prueba y el seguimiento del pedido de invitado.
 *
 * La página `/checkout` monta `Checkout` dentro de un `<Suspense>` con `CheckoutSkeleton`. Los
 * pasos 1 y 2 se guardan en `sessionStorage` (`galpon.checkout`) y el pedido se crea al elegir el
 * medio de pago (Ruling P3-5).
 *
 * El cliente de la API del navegador lee el token del pedido con `readOrderToken` y lo manda en
 * `X-Order-Token`.
 *
 * @packageDocumentation
 */
export type { CheckoutProps } from './Checkout'
export { Checkout, CheckoutSkeleton } from './Checkout'
export type { OrderSession } from './order-session'
export {
  clearOrderSession,
  ORDER_SESSION_KEY,
  readOrderSession,
  readOrderToken,
  saveOrderSession,
} from './order-session'
export * from './result'
