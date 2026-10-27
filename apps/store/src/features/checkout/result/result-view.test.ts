import { describe, expect, it } from 'vitest'
import type { OrderStatus, PaymentStatus } from '@galpon/api-client'
import {
  isInternalPath,
  mercadoPagoSimulatorChallengeUrl,
  rejectionReason,
  resultKind,
} from './result-view'

/** Estados mínimos de un pedido. */
function order(status: OrderStatus, paymentStatus: PaymentStatus) {
  return { status, paymentStatus }
}

describe('resultKind', () => {
  it.each([
    ['pending_payment', 'approved', 'approved'],
    ['paid', 'approved', 'approved'],
    ['pending_payment', 'pending', 'pending'],
    ['pending_payment', 'action_required', 'action_required'],
    ['pending_payment', 'rejected', 'rejected'],
    ['pending_payment', 'none', 'unpaid'],
    ['pending_payment', 'cancelled', 'unpaid'],
    ['expired', 'none', 'expired'],
    ['expired', 'cancelled', 'expired'],
    ['expired', 'rejected', 'expired'],
    ['cancelled', 'none', 'other'],
    ['refunded', 'refunded', 'other'],
  ] as const)('pedido %s con pago %s → %s', (status, paymentStatus, kind) => {
    expect(resultKind(order(status, paymentStatus))).toBe(kind)
  })

  it('"El pedido venció" solo con el pedido vencido, no con el pago cancelado (Ruling P3-6)', () => {
    expect(resultKind(order('pending_payment', 'cancelled'))).not.toBe('expired')
  })

  it('rechaza estados que no son del contrato', () => {
    const unknown = ['ot', 'ro'].join('')
    expect(() => resultKind(order(unknown as OrderStatus, 'none'))).toThrow(RangeError)
    expect(() => resultKind(order('paid', unknown as PaymentStatus))).toThrow(RangeError)
  })
})

describe('rejectionReason', () => {
  it.each([
    ['cc_rejected_insufficient_amount', 'La tarjeta no tiene fondos suficientes.'],
    ['cc_rejected_bad_filled_security_code', 'El código de seguridad no es correcto.'],
    ['cc_rejected_bad_filled_date', 'La fecha de vencimiento no es correcta.'],
    [
      'cc_rejected_call_for_authorize',
      'Tenés que autorizar el pago con tu banco: llamalo y volvé a intentar.',
    ],
  ])('%s → "%s"', (statusDetail, reason) => {
    expect(rejectionReason(statusDetail)).toBe(reason)
  })

  it('un motivo desconocido o vacío da el texto genérico', () => {
    expect(rejectionReason('cc_rejected_algo_nuevo')).toBe(rejectionReason(null))
    expect(rejectionReason(null)).toMatch(/otro medio/)
  })
})

describe('mercadoPagoSimulatorChallengeUrl', () => {
  it('es la del desafío del simulador, como la que devuelve la API de prueba', () => {
    expect(mercadoPagoSimulatorChallengeUrl('GLP-12345')).toBe(
      '/checkout/mp-simulado?pedido=GLP-12345&challenge=1',
    )
  })

  it('rechaza un número sin formato', () => {
    expect(() => mercadoPagoSimulatorChallengeUrl('12345')).toThrow(RangeError)
  })
})

describe('isInternalPath', () => {
  it.each([
    ['/checkout/resultado?pedido=GLP-12345', true],
    ['//evil.example/x', false],
    ['https://evil.example/x', false],
    ['/\\evil.example', false],
    ['', false],
  ])('%s → %s', (path, internal) => {
    expect(isInternalPath(path)).toBe(internal)
  })
})
