import type { ApiMode } from '@/lib/env'
import type { PaymentFields } from './payments.types'
import { createFieldEvents } from './field-events'
import { createMercadoPagoFields } from './mercadopago-fields'

/** Qué campos de tarjeta usar. */
export interface PaymentFieldsConfig {
  /** `mock` usa los campos simulados; `live`, los Secure Fields de Mercado Pago. */
  apiMode: ApiMode
  /** Clave pública de Mercado Pago (de `getStoreEnv().mpPublicKey`); hace falta en vivo. */
  publicKey: string | null
}

/** Mensaje cuando se usan los campos sin haberlos montado. */
const NOT_MOUNTED = 'Los campos de la tarjeta no están montados.'

/**
 * Campos que cargan su implementación con `import()` recién al montarse, como el SDK de Mercado
 * Pago. Así los campos simulados quedan en un chunk aparte que la tienda en vivo nunca descarga.
 * Reenvía los eventos de la implementación y soporta desmontar mientras carga (React en
 * desarrollo monta, desmonta y vuelve a montar).
 *
 * @param load - Importa y crea la implementación.
 */
function createDeferredPaymentFields(load: () => Promise<PaymentFields>): PaymentFields {
  const events = createFieldEvents()
  let loading: Promise<PaymentFields> | null = null
  let inner: PaymentFields | null = null
  let stopForwarding: () => void = () => undefined
  // Sube con cada desmontaje: un montaje que terminó de cargar después ya no corresponde.
  let generation = 0

  const instance = (): Promise<PaymentFields> => {
    loading ??= load().catch((error: unknown) => {
      loading = null
      throw error
    })
    return loading
  }
  const forward = (target: PaymentFields): (() => void) => {
    const stops = [
      target.on('binChange', (payload) => {
        events.emit('binChange', payload)
      }),
      target.on('validityChange', (payload) => {
        events.emit('validityChange', payload)
      }),
      target.on('focus', (payload) => {
        events.emit('focus', payload)
      }),
      target.on('blur', (payload) => {
        events.emit('blur', payload)
      }),
    ]
    return () => {
      for (const stop of stops) stop()
    }
  }

  return {
    async mount(fields, options) {
      generation += 1
      const mine = generation
      const loaded = await instance()
      if (mine !== generation) return
      inner = loaded
      stopForwarding = forward(loaded)
      await loaded.mount(fields, options)
    },
    on: events.on,
    createCardToken(input) {
      return inner === null
        ? Promise.reject(new RangeError(NOT_MOUNTED))
        : inner.createCardToken(input)
    },
    async getIdentificationTypes() {
      return (await instance()).getIdentificationTypes()
    },
    focus(field) {
      inner?.focus(field)
    },
    unmount() {
      generation += 1
      stopForwarding()
      stopForwarding = () => undefined
      inner?.unmount()
      inner = null
      events.clear()
    },
  }
}

/**
 * Elige la implementación de {@link PaymentFields} según el modo, que llega por prop desde el
 * servidor (nunca se detecta en el navegador). Los campos simulados se importan de forma diferida
 * y solo en modo de prueba, para que no viajen en el JavaScript de la tienda en vivo.
 *
 * @param config - Modo y clave pública.
 * @returns Campos sin montar.
 * @throws {RangeError} Si el modo es `live` y no hay clave pública.
 */
export function createPaymentFields({ apiMode, publicKey }: PaymentFieldsConfig): PaymentFields {
  if (apiMode === 'mock') {
    return createDeferredPaymentFields(async () => {
      const { createSimulatedPaymentFields } = await import('./simulated-fields')
      return createSimulatedPaymentFields()
    })
  }
  if (publicKey === null || publicKey.trim() === '') {
    throw new RangeError(
      'El pago con tarjeta en vivo necesita la clave pública de Mercado Pago (NEXT_PUBLIC_MP_PUBLIC_KEY).',
    )
  }
  return createMercadoPagoFields(publicKey)
}
