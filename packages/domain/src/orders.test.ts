import { describe, expect, it } from 'vitest'
import {
  isOrderNumber,
  ORDER_NUMBER_PATTERN,
  ORDER_RESERVATION_MINUTES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from './orders'

describe('ORDER_STATUSES', () => {
  it('son los ocho estados del pedido, en orden de ciclo de vida', () => {
    expect(ORDER_STATUSES).toEqual([
      'pending_payment',
      'paid',
      'preparing',
      'shipped',
      'delivered',
      'cancelled',
      'expired',
      'refunded',
    ])
  })
})

describe('PAYMENT_STATUSES', () => {
  it('son los diez estados del pago', () => {
    expect(PAYMENT_STATUSES).toEqual([
      'none',
      'pending',
      'action_required',
      'approved',
      'rejected',
      'cancelled',
      'refunded',
      'partially_refunded',
      'in_dispute',
      'charged_back',
    ])
  })
})

describe('PAYMENT_METHODS', () => {
  it('son Mercado Pago y tarjeta', () => {
    expect(PAYMENT_METHODS).toEqual(['mp_redirect', 'card'])
  })
})

describe('isOrderNumber', () => {
  it('acepta GLP- seguido de cinco dígitos', () => {
    expect(isOrderNumber('GLP-12345')).toBe(true)
    expect(isOrderNumber('GLP-00001')).toBe(true)
  })
  it('rechaza menos o más de cinco dígitos', () => {
    expect(isOrderNumber('GLP-1234')).toBe(false)
    expect(isOrderNumber('GLP-123456')).toBe(false)
  })
  it('rechaza minúsculas, otros prefijos y texto de más', () => {
    expect(isOrderNumber('glp-12345')).toBe(false)
    expect(isOrderNumber('XYZ-12345')).toBe(false)
    expect(isOrderNumber(' GLP-12345')).toBe(false)
    expect(isOrderNumber('GLP-12345 ')).toBe(false)
    expect(isOrderNumber('GLP-12345\n')).toBe(false)
    expect(isOrderNumber('GLP-1234a')).toBe(false)
    expect(isOrderNumber('')).toBe(false)
  })
  it('es repetible: el patrón no guarda estado entre llamadas', () => {
    expect(isOrderNumber('GLP-12345')).toBe(true)
    expect(isOrderNumber('GLP-12345')).toBe(true)
    expect(ORDER_NUMBER_PATTERN.test('GLP-12345')).toBe(true)
    expect(ORDER_NUMBER_PATTERN.test('GLP-12345')).toBe(true)
  })
})

describe('ORDER_RESERVATION_MINUTES', () => {
  it('el stock se reserva 30 minutos', () => {
    expect(ORDER_RESERVATION_MINUTES).toBe(30)
  })
})
