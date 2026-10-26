/**
 * Pago con tarjeta (spec 14.4): `CardPaymentForm` con la tarjeta animada, el selector de cuotas
 * con CFT y TEA, y el diálogo de 3-D Secure. Los campos de la tarjeta están detrás de la interfaz
 * `PaymentFields`, con dos implementaciones: los Secure Fields de Mercado Pago (en vivo) y los
 * campos simulados (modo de prueba). El modo llega por prop desde el servidor.
 *
 * @packageDocumentation
 */
export type {
  CardPaymentFormHandle,
  CardPaymentFormProps,
  CardPaymentSubmission,
} from './CardPaymentForm'
export { CardPaymentForm } from './CardPaymentForm'
export type { ChallengeDialogProps } from './ChallengeDialog'
export { ChallengeDialog } from './ChallengeDialog'
export type { PaymentFieldsConfig } from './create-payment-fields'
export { createPaymentFields } from './create-payment-fields'
export type { InstallmentsSelectProps } from './InstallmentsSelect'
export { installmentOptionLabel, InstallmentsSelect } from './InstallmentsSelect'
export { createMercadoPagoFields } from './mercadopago-fields'
export type {
  BinChangeEvent,
  CardMethod,
  CardPaymentTypeId,
  CardTokenInput,
  IdentificationType,
  PaymentFieldFocusEvent,
  PaymentFieldMount,
  PaymentFieldName,
  PaymentFields,
  PaymentFieldsEvents,
  PaymentFieldsMountOptions,
  PaymentFieldStyle,
  ValidityChangeEvent,
} from './payments.types'
export { PAYMENT_FIELD_NAMES } from './payments.types'
export type { SimulatedPaymentFieldsOptions } from './simulated-fields'
export { createSimulatedPaymentFields, detectCardBrand } from './simulated-fields'
