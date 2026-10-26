import type { ApiMode } from '@/lib/env'
import type { PaymentFields } from './payments.types'
import { createMercadoPagoFields } from './mercadopago-fields'
import { createSimulatedPaymentFields } from './simulated-fields'

/** Qué campos de tarjeta usar. */
export interface PaymentFieldsConfig {
  /** `mock` usa los campos simulados; `live`, los Secure Fields de Mercado Pago. */
  apiMode: ApiMode
  /** Clave pública de Mercado Pago (de `getStoreEnv().mpPublicKey`); hace falta en vivo. */
  publicKey: string | null
}

/**
 * Elige la implementación de {@link PaymentFields} según el modo, que llega por prop desde el
 * servidor (nunca se detecta en el navegador).
 *
 * @param config - Modo y clave pública.
 * @returns Campos sin montar.
 * @throws {RangeError} Si el modo es `live` y no hay clave pública.
 */
export function createPaymentFields({ apiMode, publicKey }: PaymentFieldsConfig): PaymentFields {
  if (apiMode === 'mock') return createSimulatedPaymentFields()
  if (publicKey === null || publicKey.trim() === '') {
    throw new RangeError(
      'El pago con tarjeta en vivo necesita la clave pública de Mercado Pago (NEXT_PUBLIC_MP_PUBLIC_KEY).',
    )
  }
  return createMercadoPagoFields(publicKey)
}
