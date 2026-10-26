// @vitest-environment jsdom
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { parseMockCardToken } from '@galpon/api-client/mock'
import type { PaymentFieldMount, PaymentFieldName, PaymentFields } from './payments.types'
import { PAYMENT_FIELD_NAMES } from './payments.types'
import { createSimulatedPaymentFields, detectCardBrand } from './simulated-fields'

const STYLE = {
  color: 'rgb(1, 2, 3)',
  fontFamily: 'Inter',
  fontSize: '14px',
  placeholderColor: 'gray',
}

/** Arma un contenedor por campo, como los del formulario. */
function containers(): Record<PaymentFieldName, PaymentFieldMount> {
  const entry = (field: PaymentFieldName): PaymentFieldMount => {
    const container = document.createElement('div')
    container.id = `box-${field}`
    document.body.append(container)
    return { container, placeholder: field, inputId: `input-${field}`, errorId: `error-${field}` }
  }
  return {
    cardNumber: entry('cardNumber'),
    expirationDate: entry('expirationDate'),
    securityCode: entry('securityCode'),
  }
}

/** El control que dibujó la implementación para un campo. */
function input(field: PaymentFieldName): HTMLInputElement {
  const element = document.getElementById(`input-${field}`)
  if (!(element instanceof HTMLInputElement)) throw new Error(`Falta el campo ${field}`)
  return element
}

/** Monta campos simulados con fecha fija (octubre de 2026). */
async function mountFields(): Promise<PaymentFields> {
  const fields = createSimulatedPaymentFields({ now: () => new Date('2026-10-26T15:00:00Z') })
  await fields.mount(containers(), { style: STYLE })
  return fields
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('detectCardBrand', () => {
  it.each([
    ['4509953566233704', 'visa', 'Visa', 3],
    ['5031755734530604', 'master', 'Mastercard', 3],
    ['371180303257522', 'amex', 'American Express', 4],
    ['341111111111111', 'amex', 'American Express', 4],
  ])('reconoce la marca de %s por el BIN', (digits, paymentMethodId, name, cvc) => {
    expect(detectCardBrand(digits)).toEqual({
      paymentMethodId,
      name,
      paymentTypeId: 'credit_card',
      issuerId: null,
      securityCodeLength: cvc,
    })
  })

  it.each(['', '6011000990139424', '3530111333300000'])('no reconoce "%s"', (digits) => {
    expect(detectCardBrand(digits)).toBeNull()
  })
})

describe('campos simulados: cumplen la interfaz de PaymentFields', () => {
  it('dibuja un control por campo, con su id, su ayuda y su descripción de error', async () => {
    await mountFields()
    for (const field of PAYMENT_FIELD_NAMES) {
      const control = input(field)
      expect(control.parentElement?.id).toBe(`box-${field}`)
      expect(control.placeholder).toBe(field)
      expect(control.getAttribute('aria-describedby')).toBe(`error-${field}`)
      expect(control.style.color).toBe('rgb(1, 2, 3)')
    }
    expect(input('cardNumber').autocomplete).toBe('cc-number')
  })

  it('no se puede montar dos veces', async () => {
    const fields = await mountFields()
    await expect(fields.mount(containers(), { style: STYLE })).rejects.toThrow(RangeError)
  })

  it('avisa el BIN y la marca desde el sexto dígito, y null al borrarlo', async () => {
    const fields = await mountFields()
    const events: unknown[] = []
    fields.on('binChange', (event) => events.push(event))
    const user = userEvent.setup()

    await user.type(input('cardNumber'), '45099')
    expect(events).toEqual([])
    await user.type(input('cardNumber'), '5')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ bin: '450995', method: { paymentMethodId: 'visa' } })
    await user.type(input('cardNumber'), '35')
    expect(events.at(-1)).toMatchObject({ bin: '45099535', method: { paymentMethodId: 'visa' } })
    await user.clear(input('cardNumber'))
    expect(events.at(-1)).toEqual({ bin: null, method: null })
  })

  it('agrupa el número de a 4 y no deja escribir más de 16 dígitos (15 en Amex)', async () => {
    await mountFields()
    const user = userEvent.setup()
    await user.type(input('cardNumber'), '4509 9535 6623 3704 99')
    expect(input('cardNumber').value).toBe('4509 9535 6623 3704')
    await user.clear(input('cardNumber'))
    await user.type(input('cardNumber'), '3711803032575229')
    expect(input('cardNumber').value).toBe('3711 8030 3257 522')
  })

  it('avisa la validez de cada campo y el foco', async () => {
    const fields = await mountFields()
    const validity: unknown[] = []
    const focus: unknown[] = []
    fields.on('validityChange', (event) => validity.push(event))
    fields.on('focus', (event) => focus.push(['focus', event.field]))
    fields.on('blur', (event) => focus.push(['blur', event.field]))
    const user = userEvent.setup()

    await user.type(input('cardNumber'), '4509953566233704')
    await user.type(input('expirationDate'), '1130')
    await user.type(input('securityCode'), '123')
    await user.tab()

    expect(input('expirationDate').value).toBe('11/30')
    expect(validity).toEqual([
      { field: 'cardNumber', valid: true },
      { field: 'cardNumber', valid: true },
      { field: 'expirationDate', valid: true },
      { field: 'expirationDate', valid: true },
      { field: 'securityCode', valid: true },
      { field: 'securityCode', valid: true },
    ])
    expect(focus).toEqual([
      ['focus', 'cardNumber'],
      ['blur', 'cardNumber'],
      ['focus', 'expirationDate'],
      ['blur', 'expirationDate'],
      ['focus', 'securityCode'],
      ['blur', 'securityCode'],
    ])
  })

  it('marca inválidos el número incompleto, un vencimiento pasado y el CVC corto', async () => {
    const fields = await mountFields()
    const validity: unknown[] = []
    fields.on('validityChange', (event) => validity.push(event))
    const user = userEvent.setup()

    await user.type(input('cardNumber'), '450995')
    await user.type(input('expirationDate'), '0926')
    await user.type(input('securityCode'), '12')
    await user.tab()

    expect(validity).toEqual([
      { field: 'cardNumber', valid: false },
      { field: 'expirationDate', valid: false },
      { field: 'securityCode', valid: false },
    ])
  })

  it('el vencimiento del mes en curso es válido y un mes 13 no', async () => {
    const fields = await mountFields()
    const validity: unknown[] = []
    fields.on('validityChange', (event) => {
      if (event.field === 'expirationDate') validity.push(event)
    })
    const user = userEvent.setup()

    await user.type(input('expirationDate'), '1026')
    await user.tab()
    await user.clear(input('expirationDate'))
    await user.type(input('expirationDate'), '1327')
    await user.tab()

    expect(validity).toEqual([
      { field: 'expirationDate', valid: true },
      { field: 'expirationDate', valid: true },
      { field: 'expirationDate', valid: false },
      { field: 'expirationDate', valid: false },
    ])
  })

  it('el token codifica el titular de prueba y los últimos 4 dígitos, nunca el número', async () => {
    const fields = await mountFields()
    const user = userEvent.setup()
    await user.type(input('cardNumber'), '4509953566233704')

    const token = await fields.createCardToken({
      cardholderName: ' apro ',
      identificationType: 'DNI',
      identificationNumber: '12345678',
    })

    expect(token).not.toContain('4509953566233704')
    expect(parseMockCardToken(token)).toEqual({ holder: 'APRO', lastFour: '3704' })
    const other = await fields.createCardToken({
      cardholderName: 'Juana Pérez',
      identificationType: 'DNI',
      identificationNumber: '12345678',
    })
    expect(other).not.toBe(token)
    expect(parseMockCardToken(other)?.holder).toBe('OTHE')
  })

  it('createCardToken pide titular y documento, y campos montados', async () => {
    const unmounted = createSimulatedPaymentFields()
    const input = { cardholderName: 'APRO', identificationType: 'DNI', identificationNumber: '1' }
    await expect(unmounted.createCardToken(input)).rejects.toThrow(RangeError)
    const fields = await mountFields()
    await expect(fields.createCardToken({ ...input, cardholderName: ' ' })).rejects.toThrow(
      RangeError,
    )
    await expect(fields.createCardToken({ ...input, identificationNumber: '' })).rejects.toThrow(
      RangeError,
    )
  })

  it('focus lleva el foco al campo pedido', async () => {
    const fields = await mountFields()
    fields.focus('securityCode')
    expect(document.activeElement).toBe(input('securityCode'))
  })

  it('ofrece DNI como primer tipo de documento', async () => {
    const fields = await mountFields()
    const types = await fields.getIdentificationTypes()
    expect(types[0]).toEqual({ id: 'DNI', name: 'DNI' })
  })

  it('unmount quita los controles y deja de avisar', async () => {
    const fields = await mountFields()
    const events: unknown[] = []
    fields.on('binChange', (event) => events.push(event))
    const control = input('cardNumber')
    fields.unmount()
    fields.unmount()

    expect(document.getElementById('input-cardNumber')).toBeNull()
    control.value = '450995'
    control.dispatchEvent(new Event('input', { bubbles: true }))
    expect(events).toEqual([])
  })
})
