import type {
  CardMethod,
  CardTokenInput,
  IdentificationType,
  PaymentFieldName,
  PaymentFields,
} from './payments.types'
import { createFieldEvents } from './field-events'
import { PAYMENT_FIELD_NAMES } from './payments.types'

/** Reglas de un campo según el medio de pago (`settings` de `getPaymentMethods`). */
interface MercadoPagoFieldSettings {
  length: number
  [key: string]: unknown
}

/** Medio de pago que devuelve `getPaymentMethods`. */
interface MercadoPagoPaymentMethod {
  id: string
  name: string
  payment_type_id: string
  issuer?: { id: number | string } | null
  additional_info_needed?: string[]
  settings?: {
    card_number?: MercadoPagoFieldSettings
    security_code?: MercadoPagoFieldSettings
  }[]
}

/** Campo seguro de MercadoPago.js (un iframe). */
interface MercadoPagoField {
  mount(containerId: string): unknown
  unmount(): void
  update(options: { settings: MercadoPagoFieldSettings }): void
  focus(): void
  on(
    event: string,
    listener: (data?: { bin?: string | null; errorMessages?: unknown[] }) => void,
  ): unknown
}

/** Lo que usa la tienda de una instancia de `window.MercadoPago`. */
interface MercadoPagoInstance {
  fields: {
    create(
      type: PaymentFieldName,
      options: { placeholder: string; style: Record<string, string> },
    ): MercadoPagoField
    createCardToken(input: CardTokenInput): Promise<{ id: string }>
  }
  getPaymentMethods(input: { bin: string }): Promise<{ results: MercadoPagoPaymentMethod[] }>
  getIssuers(input: { paymentMethodId: string; bin: string }): Promise<{ id: number | string }[]>
  getIdentificationTypes(): Promise<{ id: string; name: string }[]>
}

/** Constructor global que deja MercadoPago.js. */
type MercadoPagoConstructor = new (
  publicKey: string,
  options: { locale: string },
) => MercadoPagoInstance

/** Idioma de los campos y mensajes de Mercado Pago. */
const LOCALE = 'es-AR'

/** Carga MercadoPago.js recién cuando hace falta y crea la instancia con la clave pública. */
async function loadInstance(publicKey: string): Promise<MercadoPagoInstance> {
  const { loadMercadoPago } = await import('@mercadopago/sdk-js')
  await loadMercadoPago()
  const constructor: unknown = (window as Window & { MercadoPago?: unknown }).MercadoPago
  if (typeof constructor !== 'function') {
    throw new Error('MercadoPago.js no quedó disponible en la página.')
  }
  return new (constructor as MercadoPagoConstructor)(publicKey, { locale: LOCALE })
}

/**
 * Busca el medio de pago de un BIN, ajusta el largo del número y del CVC, y resuelve el emisor.
 *
 * @returns El medio de pago, o `null` si Mercado Pago no reconoce el BIN.
 */
async function resolveMethod(
  mp: MercadoPagoInstance,
  bin: string,
  elements: Record<PaymentFieldName, MercadoPagoField>,
): Promise<CardMethod | null> {
  const { results } = await mp.getPaymentMethods({ bin })
  const found = results[0]
  if (found === undefined) return null
  const settings = found.settings?.[0]
  if (settings?.card_number !== undefined) {
    elements.cardNumber.update({ settings: settings.card_number })
  }
  if (settings?.security_code !== undefined) {
    elements.securityCode.update({ settings: settings.security_code })
  }
  let issuerId = found.issuer == null ? null : String(found.issuer.id)
  if (found.additional_info_needed?.includes('issuer_id') === true) {
    const [issuer] = await mp.getIssuers({ paymentMethodId: found.id, bin })
    if (issuer !== undefined) issuerId = String(issuer.id)
  }
  return {
    paymentMethodId: found.id,
    name: found.name,
    paymentTypeId: found.payment_type_id === 'credit_card' ? 'credit_card' : 'debit_card',
    issuerId,
    securityCodeLength: settings?.security_code?.length ?? 3,
  }
}

/** Pone el DNI primero, como pide el spec (DNI por defecto). */
function dniFirst(types: IdentificationType[]): IdentificationType[] {
  return [...types].sort((a, b) => Number(b.id === 'DNI') - Number(a.id === 'DNI'))
}

/**
 * Campos de tarjeta en vivo: Secure Fields de MercadoPago.js v2 (spec 14.4). Carga el SDK recién
 * al montar, crea los iframes de número, vencimiento y CVC, consulta el medio de pago por BIN
 * (`getPaymentMethods`, y `getIssuers` si hace falta) y ajusta el largo de los campos. La tienda
 * nunca lee los dígitos: solo recibe el BIN, la validez de cada campo y el token.
 *
 * @param publicKey - Clave pública de Mercado Pago (`NEXT_PUBLIC_MP_PUBLIC_KEY`).
 * @returns Campos sin montar.
 * @throws {RangeError} Si la clave está vacía.
 */
export function createMercadoPagoFields(publicKey: string): PaymentFields {
  if (publicKey.trim() === '') {
    throw new RangeError('Falta la clave pública de Mercado Pago.')
  }
  const events = createFieldEvents()
  let instance: Promise<MercadoPagoInstance> | null = null
  let elements: Record<PaymentFieldName, MercadoPagoField> | null = null
  let generation = 0
  let currentBin: string | null = null

  const onBin = async (mp: MercadoPagoInstance, bin: string | null): Promise<void> => {
    if (bin === currentBin || elements === null) return
    currentBin = bin
    if (bin === null) {
      events.emit('binChange', { bin: null, method: null })
      return
    }
    const method = await resolveMethod(mp, bin, elements).catch(() => null)
    if (bin === currentBin) events.emit('binChange', { bin, method })
  }

  return {
    async mount(fields, { style }) {
      if (instance !== null) throw new RangeError('Los campos de la tarjeta ya están montados.')
      for (const field of PAYMENT_FIELD_NAMES) {
        if (fields[field].container.id === '') {
          throw new RangeError(`El contenedor de ${field} necesita un id para Mercado Pago.`)
        }
      }
      const mounting = ++generation
      instance = loadInstance(publicKey)
      const mp = await instance
      if (mounting !== generation) return
      const create = (field: PaymentFieldName): MercadoPagoField => {
        const element = mp.fields.create(field, {
          placeholder: fields[field].placeholder,
          style: { ...style, height: '100%' },
        })
        element.on('validityChange', (data) => {
          events.emit('validityChange', { field, valid: (data?.errorMessages ?? []).length === 0 })
        })
        element.on('focus', () => {
          events.emit('focus', { field })
        })
        element.on('blur', () => {
          events.emit('blur', { field })
        })
        element.mount(fields[field].container.id)
        return element
      }
      const created = {
        cardNumber: create('cardNumber'),
        expirationDate: create('expirationDate'),
        securityCode: create('securityCode'),
      }
      created.cardNumber.on('binChange', (data) => {
        void onBin(mp, data?.bin ?? null)
      })
      elements = created
    },
    on: events.on,
    async createCardToken(input) {
      if (input.cardholderName.trim() === '') {
        throw new RangeError('El nombre del titular no puede estar vacío.')
      }
      if (input.identificationType.trim() === '' || input.identificationNumber.trim() === '') {
        throw new RangeError('Falta el documento del titular.')
      }
      if (instance === null || elements === null) {
        throw new RangeError('Los campos de la tarjeta no están montados.')
      }
      const mp = await instance
      const token = await mp.fields.createCardToken({
        cardholderName: input.cardholderName.trim(),
        identificationType: input.identificationType,
        identificationNumber: input.identificationNumber,
      })
      return token.id
    },
    async getIdentificationTypes() {
      if (instance === null) {
        throw new RangeError('Montá los campos antes de pedir los tipos de documento.')
      }
      const mp = await instance
      const types = await mp.getIdentificationTypes()
      return dniFirst(types.map(({ id, name }) => ({ id, name })))
    },
    focus(field) {
      elements?.[field].focus()
    },
    unmount() {
      generation += 1
      if (elements !== null) {
        for (const field of PAYMENT_FIELD_NAMES) elements[field].unmount()
      }
      elements = null
      instance = null
      currentBin = null
      events.clear()
    },
  }
}
