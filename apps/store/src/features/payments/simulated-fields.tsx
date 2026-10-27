import { createMockCardToken } from '@galpon/api-client/mock/card-token'
import { AR_TIME_ZONE } from '@galpon/domain'
import type {
  CardMethod,
  CardTokenInput,
  IdentificationType,
  PaymentFieldMount,
  PaymentFieldName,
  PaymentFields,
  PaymentFieldStyle,
} from './payments.types'
import { createFieldEvents } from './field-events'
import { PAYMENT_FIELD_NAMES } from './payments.types'

/** Opciones de {@link createSimulatedPaymentFields}. */
export interface SimulatedPaymentFieldsOptions {
  /** Fecha actual, para saber si la tarjeta está vencida. Por defecto, la del sistema. */
  now?: () => Date
}

/** Marcas que reconocen los campos simulados por los primeros dígitos. */
const SIMULATED_BRANDS: readonly { pattern: RegExp; method: CardMethod }[] = [
  {
    pattern: /^4/,
    method: {
      paymentMethodId: 'visa',
      name: 'Visa',
      paymentTypeId: 'credit_card',
      issuerId: null,
      securityCodeLength: 3,
    },
  },
  {
    pattern: /^5/,
    method: {
      paymentMethodId: 'master',
      name: 'Mastercard',
      paymentTypeId: 'credit_card',
      issuerId: null,
      securityCodeLength: 3,
    },
  },
  {
    pattern: /^3[47]/,
    method: {
      paymentMethodId: 'amex',
      name: 'American Express',
      paymentTypeId: 'credit_card',
      issuerId: null,
      securityCodeLength: 4,
    },
  },
]

/** Tipos de documento del modo de prueba (el DNI de prueba es 12345678). */
const SIMULATED_IDENTIFICATION_TYPES: readonly IdentificationType[] = [
  { id: 'DNI', name: 'DNI' },
  { id: 'CUIT', name: 'CUIT' },
]

/** Atributos propios de cada control simulado. */
const CONTROL_ATTRIBUTES: Record<PaymentFieldName, { autocomplete: AutoFill }> = {
  cardNumber: { autocomplete: 'cc-number' },
  expirationDate: { autocomplete: 'cc-exp' },
  securityCode: { autocomplete: 'cc-csc' },
}

/** Largo del número de una tarjeta: 15 en Amex, 16 en las demás. */
function cardNumberLength(method: CardMethod | null): number {
  return method?.paymentMethodId === 'amex' ? 15 : 16
}

/** Primeros 8 dígitos (o 6 si todavía no hay 8), como el `bin` de Mercado Pago. */
function binOf(digits: string): string | null {
  if (digits.length >= 8) return digits.slice(0, 8)
  if (digits.length >= 6) return digits.slice(0, 6)
  return null
}

/** Año y mes de hoy en Buenos Aires, como un número de meses. */
function currentMonthIndex(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AR_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const part = (type: 'year' | 'month'): number =>
    Number(parts.find((candidate) => candidate.type === type)?.value)
  return part('year') * 12 + part('month')
}

/** Indica si un vencimiento `MMAA` (solo dígitos) es un mes real y no pasó. */
function isValidExpiration(digits: string, now: Date): boolean {
  if (!/^\d{4}$/.test(digits)) return false
  const month = Number(digits.slice(0, 2))
  const year = 2000 + Number(digits.slice(2))
  return month >= 1 && month <= 12 && year * 12 + month >= currentMonthIndex(now)
}

/**
 * Reconoce la marca de una tarjeta por sus primeros dígitos, como hacen los campos simulados:
 * Visa empieza con 4, Mastercard con 5 y American Express con 34 o 37.
 *
 * @param digits - Dígitos del número, sin espacios.
 * @returns El medio de pago (siempre crédito, sin emisor), o `null` si no es una de las tres.
 * @throws {RangeError} Si el texto tiene algo que no es un dígito.
 * @example
 * detectCardBrand('450995')?.paymentMethodId // 'visa'
 */
export function detectCardBrand(digits: string): CardMethod | null {
  if (!/^\d*$/.test(digits)) {
    throw new RangeError('El número de la tarjeta tiene que tener solo dígitos.')
  }
  const brand = SIMULATED_BRANDS.find((candidate) => candidate.pattern.test(digits))
  return brand === undefined ? null : { ...brand.method }
}

/** Crea el control de un campo simulado, con el estilo de los Secure Fields. */
function createControl(
  field: PaymentFieldName,
  mount: PaymentFieldMount,
  style: PaymentFieldStyle,
): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'text'
  input.inputMode = 'numeric'
  input.id = mount.inputId
  input.placeholder = mount.placeholder
  input.autocomplete = CONTROL_ATTRIBUTES[field].autocomplete
  input.spellcheck = false
  input.setAttribute('aria-describedby', mount.errorId)
  Object.assign(input.style, {
    width: '100%',
    height: '100%',
    margin: '0',
    padding: '0',
    border: '0',
    outline: 'none',
    background: 'transparent',
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
  })
  return input
}

/**
 * Campos de tarjeta del modo de prueba: inputs propios con la misma interfaz que los Secure Fields
 * de Mercado Pago. Reconocen la marca por el BIN ({@link detectCardBrand}), validan largo,
 * vencimiento y CVC, y arman el token con `createMockCardToken`, que lleva el titular (para que el
 * mock decida el resultado, como el sandbox: `APRO`, `CONT`, `3DS`…) y los últimos 4 dígitos.
 * Nada de lo escrito sale del navegador.
 *
 * @param options - Ver {@link SimulatedPaymentFieldsOptions}.
 * @returns Campos sin montar.
 */
export function createSimulatedPaymentFields(
  options: SimulatedPaymentFieldsOptions = {},
): PaymentFields {
  const now = options.now ?? (() => new Date())
  const events = createFieldEvents()
  const validity: Record<PaymentFieldName, boolean> = {
    cardNumber: false,
    expirationDate: false,
    securityCode: false,
  }
  let controls: Record<PaymentFieldName, HTMLInputElement> | null = null
  let detach: (() => void)[] = []
  let cardDigits = ''
  let bin: string | null = null
  let method: CardMethod | null = null

  const setValidity = (field: PaymentFieldName, valid: boolean): void => {
    if (validity[field] === valid) return
    validity[field] = valid
    events.emit('validityChange', { field, valid })
  }

  const checkSecurityCode = (input: HTMLInputElement): void => {
    const digits = input.value.replace(/\D/g, '').slice(0, method?.securityCodeLength ?? 4)
    input.value = digits
    setValidity('securityCode', digits.length === (method?.securityCodeLength ?? 3))
  }

  const handlers: Record<
    PaymentFieldName,
    (input: HTMLInputElement, all: Record<PaymentFieldName, HTMLInputElement>) => void
  > = {
    cardNumber: (input, all) => {
      const typed = input.value.replace(/\D/g, '')
      cardDigits = typed.slice(0, cardNumberLength(detectCardBrand(typed)))
      input.value = cardDigits.replace(/(\d{4})(?=\d)/g, '$1 ')
      const nextBin = binOf(cardDigits)
      if (nextBin !== bin) {
        bin = nextBin
        method = nextBin === null ? null : detectCardBrand(nextBin)
        events.emit('binChange', { bin, method: method === null ? null : { ...method } })
        if (all.securityCode.value !== '') checkSecurityCode(all.securityCode)
      }
      setValidity('cardNumber', method !== null && cardDigits.length === cardNumberLength(method))
    },
    expirationDate: (input) => {
      const digits = input.value.replace(/\D/g, '').slice(0, 4)
      input.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
      setValidity('expirationDate', isValidExpiration(digits, now()))
    },
    securityCode: checkSecurityCode,
  }

  return {
    mount(fields, { style }) {
      return new Promise((resolve) => {
        if (controls !== null) {
          throw new RangeError('Los campos de la tarjeta ya están montados.')
        }
        const created = {
          cardNumber: createControl('cardNumber', fields.cardNumber, style),
          expirationDate: createControl('expirationDate', fields.expirationDate, style),
          securityCode: createControl('securityCode', fields.securityCode, style),
        }
        for (const field of PAYMENT_FIELD_NAMES) {
          const input = created[field]
          const onInput = (): void => {
            handlers[field](input, created)
          }
          const onFocus = (): void => {
            events.emit('focus', { field })
          }
          const onBlur = (): void => {
            events.emit('validityChange', { field, valid: validity[field] })
            events.emit('blur', { field })
          }
          input.addEventListener('input', onInput)
          input.addEventListener('focus', onFocus)
          input.addEventListener('blur', onBlur)
          detach.push(() => {
            input.removeEventListener('input', onInput)
            input.removeEventListener('focus', onFocus)
            input.removeEventListener('blur', onBlur)
            input.remove()
          })
          fields[field].container.append(input)
        }
        controls = created
        resolve()
      })
    },
    on: events.on,
    createCardToken(input: CardTokenInput) {
      return new Promise((resolve) => {
        if (controls === null) {
          throw new RangeError('Los campos de la tarjeta no están montados.')
        }
        if (input.identificationType.trim() === '' || input.identificationNumber.trim() === '') {
          throw new RangeError('Falta el documento del titular.')
        }
        resolve(
          createMockCardToken({
            cardholderName: input.cardholderName,
            lastFour: cardDigits.length >= 4 ? cardDigits.slice(-4) : undefined,
          }),
        )
      })
    },
    getIdentificationTypes() {
      return Promise.resolve(SIMULATED_IDENTIFICATION_TYPES.map((type) => ({ ...type })))
    },
    focus(field) {
      controls?.[field].focus()
    },
    unmount() {
      for (const undo of detach) undo()
      detach = []
      controls = null
      events.clear()
      cardDigits = ''
      bin = null
      method = null
      for (const field of PAYMENT_FIELD_NAMES) validity[field] = false
    },
  }
}
