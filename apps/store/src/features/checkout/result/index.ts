/**
 * Resultado del checkout (spec 14.2): `/checkout/resultado`, el simulador de Mercado Pago del
 * modo de prueba (`/checkout/mp-simulado`) y el seguimiento del pedido de invitado
 * (`/pedido/{numero}`). Lo reexporta el índice de `features/checkout`.
 *
 * Para cerrar un diálogo de 3-D Secure abierto sobre el simulador, quien lo abre escucha
 * `message` y lo reconoce con `isChallengeDoneMessage`. `rejectionReason` traduce el
 * `statusDetail` de un rechazo a un motivo en español.
 *
 * @packageDocumentation
 */
export type { CheckoutResultProps } from './CheckoutResult'
export type { GuestOrderTrackingProps } from './GuestOrderTracking'
export type { OrderResultProps } from './OrderResult'
export { CheckoutResult } from './CheckoutResult'
export { GuestOrderTracking } from './GuestOrderTracking'
export { MercadoPagoSimulator } from './MercadoPagoSimulator'
export { CHALLENGE_DONE_MESSAGE, isChallengeDoneMessage } from './mp-simulator'
export { OrderResult, OrderResultLoading } from './OrderResult'
export { rejectionReason } from './result-view'
