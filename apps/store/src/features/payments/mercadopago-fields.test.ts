// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PaymentFieldMount, PaymentFieldName } from './payments.types'
import { createMercadoPagoFields } from './mercadopago-fields'
import { PAYMENT_FIELD_NAMES } from './payments.types'

vi.mock('@mercadopago/sdk-js', () => ({
  loadMercadoPago: vi.fn(() => Promise.resolve(null)),
}))

type Listener = (data?: { bin?: string | null; errorMessages?: unknown[] }) => void

/** Campo seguro de mentira: guarda dónde se montó, sus ajustes y sus suscripciones. */
class FakeField {
  readonly listeners = new Map<string, Listener>()
  readonly updates: unknown[] = []
  mountedOn: string | null = null
  focused = false

  constructor(
    readonly type: string,
    readonly options: unknown,
  ) {}

  mount(containerId: string): this {
    this.mountedOn = containerId
    return this
  }

  unmount(): void {
    this.mountedOn = null
  }

  update(options: unknown): void {
    this.updates.push(options)
  }

  focus(): void {
    this.focused = true
  }

  on(event: string, listener: Listener): this {
    this.listeners.set(event, listener)
    return this
  }

  emit(event: string, data?: { bin?: string | null; errorMessages?: unknown[] }): void {
    this.listeners.get(event)?.(data)
  }
}

/** Instancia de mentira de `window.MercadoPago`. */
class FakeMercadoPago {
  static last: FakeMercadoPago | null = null
  readonly created = new Map<string, FakeField>()
  readonly tokenInputs: unknown[] = []
  readonly fields = {
    create: (type: string, options: unknown) => {
      const field = new FakeField(type, options)
      this.created.set(type, field)
      return field
    },
    createCardToken: (input: unknown) => {
      this.tokenInputs.push(input)
      return Promise.resolve({ id: 'tok_123' })
    },
  }

  constructor(
    readonly publicKey: string,
    readonly options: unknown,
  ) {
    FakeMercadoPago.last = this
  }

  getPaymentMethods({ bin }: { bin: string }) {
    if (bin.startsWith('9')) return Promise.resolve({ results: [] })
    return Promise.resolve({
      results: [
        {
          id: 'amex',
          name: 'American Express',
          payment_type_id: 'credit_card',
          issuer: { id: 310 },
          additional_info_needed: ['issuer_id'],
          settings: [{ card_number: { length: 15 }, security_code: { length: 4 } }],
        },
      ],
    })
  }

  getIssuers() {
    return Promise.resolve([{ id: 1001 }])
  }

  getIdentificationTypes() {
    return Promise.resolve([
      { id: 'CUIT', name: 'CUIT' },
      { id: 'DNI', name: 'DNI' },
    ])
  }

  field(type: PaymentFieldName): FakeField {
    const field = this.created.get(type)
    if (field === undefined) throw new Error(`Falta el campo ${type}`)
    return field
  }
}

/** Contenedores con id, como los del formulario. */
function containers(withIds = true): Record<PaymentFieldName, PaymentFieldMount> {
  const entry = (field: PaymentFieldName): PaymentFieldMount => {
    const container = document.createElement('div')
    if (withIds) container.id = `box-${field}`
    return { container, placeholder: `ayuda ${field}`, inputId: 'x', errorId: 'y' }
  }
  return {
    cardNumber: entry('cardNumber'),
    expirationDate: entry('expirationDate'),
    securityCode: entry('securityCode'),
  }
}

const STYLE = { color: 'red', fontFamily: 'Inter', fontSize: '14px', placeholderColor: 'gray' }

/** Monta los campos en vivo con el SDK de mentira. */
async function mountLive() {
  Object.assign(window, { MercadoPago: FakeMercadoPago })
  const fields = createMercadoPagoFields('TEST-public-key')
  await fields.mount(containers(), { style: STYLE })
  const mp = FakeMercadoPago.last
  if (mp === null) throw new Error('No se creó la instancia')
  return { fields, mp }
}

afterEach(() => {
  Reflect.deleteProperty(window, 'MercadoPago')
  FakeMercadoPago.last = null
})

describe('createMercadoPagoFields', () => {
  it('pide una clave pública', () => {
    expect(() => createMercadoPagoFields(' ')).toThrow(RangeError)
  })

  it('crea los tres Secure Fields en español y los monta por id', async () => {
    const { mp } = await mountLive()

    expect(mp.publicKey).toBe('TEST-public-key')
    expect(mp.options).toEqual({ locale: 'es-AR' })
    for (const field of PAYMENT_FIELD_NAMES) {
      expect(mp.field(field).mountedOn).toBe(`box-${field}`)
      expect(mp.field(field).options).toEqual({
        placeholder: `ayuda ${field}`,
        style: { ...STYLE, height: '100%' },
      })
    }
  })

  it('rechaza contenedores sin id', async () => {
    Object.assign(window, { MercadoPago: FakeMercadoPago })
    const fields = createMercadoPagoFields('TEST-public-key')
    await expect(fields.mount(containers(false), { style: STYLE })).rejects.toThrow(RangeError)
  })

  it('por BIN busca el medio de pago, ajusta los largos y resuelve el emisor', async () => {
    const { fields, mp } = await mountLive()
    const events: unknown[] = []
    fields.on('binChange', (event) => events.push(event))

    mp.field('cardNumber').emit('binChange', { bin: '37118030' })
    await vi.waitFor(() => {
      expect(events).toHaveLength(1)
    })

    expect(events[0]).toEqual({
      bin: '37118030',
      method: {
        paymentMethodId: 'amex',
        name: 'American Express',
        paymentTypeId: 'credit_card',
        issuerId: '1001',
        securityCodeLength: 4,
      },
    })
    expect(mp.field('cardNumber').updates).toEqual([{ settings: { length: 15 } }])
    expect(mp.field('securityCode').updates).toEqual([{ settings: { length: 4 } }])

    mp.field('cardNumber').emit('binChange', { bin: '99999999' })
    mp.field('cardNumber').emit('binChange', { bin: null })
    await vi.waitFor(() => {
      expect(events.at(-1)).toEqual({ bin: null, method: null })
    })
    expect(events).toHaveLength(2)
  })

  it('traduce la validez, el foco y el token', async () => {
    const { fields, mp } = await mountLive()
    const events: unknown[] = []
    fields.on('validityChange', (event) => events.push(event))
    fields.on('focus', (event) => events.push(['focus', event.field]))

    mp.field('expirationDate').emit('validityChange', { errorMessages: [{ message: 'x' }] })
    mp.field('expirationDate').emit('validityChange', { errorMessages: [] })
    mp.field('securityCode').emit('focus')
    fields.focus('cardNumber')

    expect(events).toEqual([
      { field: 'expirationDate', valid: false },
      { field: 'expirationDate', valid: true },
      ['focus', 'securityCode'],
    ])
    expect(mp.field('cardNumber').focused).toBe(true)
    const input = {
      cardholderName: ' APRO ',
      identificationType: 'DNI',
      identificationNumber: '12345678',
    }
    await expect(fields.createCardToken(input)).resolves.toBe('tok_123')
    expect(mp.tokenInputs).toEqual([{ ...input, cardholderName: 'APRO' }])
    await expect(fields.getIdentificationTypes()).resolves.toEqual([
      { id: 'DNI', name: 'DNI' },
      { id: 'CUIT', name: 'CUIT' },
    ])
  })

  it('unmount desmonta los iframes y deja de avisar', async () => {
    const { fields, mp } = await mountLive()
    const events: unknown[] = []
    fields.on('validityChange', (event) => events.push(event))

    fields.unmount()
    mp.field('cardNumber').emit('validityChange', { errorMessages: [] })

    expect(mp.field('cardNumber').mountedOn).toBeNull()
    expect(events).toEqual([])
    await expect(
      fields.createCardToken({
        cardholderName: 'APRO',
        identificationType: 'DNI',
        identificationNumber: '1',
      }),
    ).rejects.toThrow(RangeError)
  })
})
