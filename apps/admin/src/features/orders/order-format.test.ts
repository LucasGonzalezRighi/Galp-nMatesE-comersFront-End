import { describe, expect, it } from 'vitest'
import type { OrderPayment } from '@galpon/api-client'
import {
  formatMoney,
  formatOrderAddress,
  formatTimeOfDay,
  mercadoPagoPaymentUrl,
  paymentMethodText,
  statusDetailText,
} from './order-format'

/** Pago de ejemplo con lo mínimo; cada test pisa lo que necesita. */
function payment(overrides: Partial<OrderPayment> = {}): OrderPayment {
  return {
    method: 'card',
    statusDetail: null,
    installments: null,
    paymentTypeId: null,
    lastFour: null,
    mpPaymentId: null,
    challenge: null,
    ...overrides,
  }
}

describe('formatOrderAddress', () => {
  it('a domicilio: calle, número y depto, y después código postal, ciudad y provincia', () => {
    expect(
      formatOrderAddress({
        street: 'Av. Corrientes',
        number: '1234',
        apartment: '5° B',
        city: 'CABA',
        postalCode: 'C1043AAZ',
        province: 'CABA',
      }),
    ).toEqual(['Av. Corrientes 1234, 5° B', 'C1043AAZ CABA, CABA'])
    expect(
      formatOrderAddress({
        street: 'Calle 7',
        number: '845',
        apartment: null,
        city: 'La Plata',
        postalCode: 'B1900',
        province: 'Buenos Aires',
      }),
    ).toEqual(['Calle 7 845', 'B1900 La Plata, Buenos Aires'])
  })

  it('a sucursal: solo la línea del lugar', () => {
    expect(
      formatOrderAddress({ city: 'Córdoba', postalCode: 'X5000', province: 'Córdoba' }),
    ).toEqual(['X5000 Córdoba, Córdoba'])
  })
})

describe('statusDetailText', () => {
  it('traduce los códigos conocidos de Mercado Pago', () => {
    expect(statusDetailText('accredited')).toEqual({ text: 'Acreditado', isCode: false })
    expect(statusDetailText('pending_contingency')).toEqual({ text: 'En proceso', isCode: false })
    expect(statusDetailText('cc_rejected_call_for_authorize')).toEqual({
      text: 'Hay que autorizarlo con el banco',
      isCode: false,
    })
  })

  it('deja tal cual un código desconocido, marcado como código', () => {
    expect(statusDetailText('refunded')).toEqual({ text: 'refunded', isCode: true })
  })

  it('lanza RangeError con un código vacío', () => {
    expect(() => statusDetailText(' ')).toThrow(RangeError)
  })
})

describe('paymentMethodText', () => {
  it('suma el tipo de medio cuando lo conoce', () => {
    expect(paymentMethodText(payment({ paymentTypeId: 'credit_card' }))).toBe(
      'Tarjeta en la tienda · crédito',
    )
    expect(
      paymentMethodText(payment({ method: 'mp_redirect', paymentTypeId: 'account_money' })),
    ).toBe('Mercado Pago · dinero en cuenta')
    expect(paymentMethodText(payment({ paymentTypeId: 'debit_card' }))).toBe(
      'Tarjeta en la tienda · débito',
    )
  })

  it('sin tipo o con uno desconocido muestra solo el medio', () => {
    expect(paymentMethodText(payment({ method: 'mp_redirect' }))).toBe('Mercado Pago')
    expect(paymentMethodText(payment({ paymentTypeId: 'ticket' }))).toBe('Tarjeta en la tienda')
  })
})

describe('mercadoPagoPaymentUrl', () => {
  it('arma el enlace a la actividad de Mercado Pago con el ID', () => {
    expect(mercadoPagoPaymentUrl('1509001001')).toBe(
      'https://www.mercadopago.com.ar/activities?q=1509001001',
    )
    expect(mercadoPagoPaymentUrl('a b')).toBe('https://www.mercadopago.com.ar/activities?q=a%20b')
  })

  it('lanza RangeError con un ID vacío', () => {
    expect(() => mercadoPagoPaymentUrl('')).toThrow(RangeError)
  })
})

describe('formatMoney y formatTimeOfDay', () => {
  it('formatea pesos y la hora de Buenos Aires', () => {
    expect(formatMoney(46499)).toBe('$46.499')
    expect(formatMoney(0)).toBe('$0')
    expect(formatTimeOfDay('2026-10-27T15:20:00Z')).toBe('12:20')
  })

  it('lanza RangeError con un monto que no es un entero de pesos', () => {
    expect(() => formatMoney(1.5)).toThrow(RangeError)
  })
})
