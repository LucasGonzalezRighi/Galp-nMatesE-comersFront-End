import { describe, expect, it } from 'vitest'
import type { AdminOrderTarget } from './admin-orders'
import type { OrderStatus, PaymentStatus } from './orders'
import {
  ADMIN_ORDER_TARGETS,
  adminOrderTargets,
  CANCELLABLE_PAYMENT_STATUSES,
  checkOrderTransition,
  ORDERS_TO_SHIP_STATUSES,
  SOLD_ORDER_STATUSES,
} from './admin-orders'
import { ORDER_STATUSES, PAYMENT_STATUSES } from './orders'

/** Estados del pedido que no esperan el pago: sus destinos no dependen del pago. */
type SettledStatus = Exclude<OrderStatus, 'pending_payment'>

/** Destinos de cada estado cuando el pedido no está esperando el pago (refinamiento 7). */
const TARGETS_BY_STATUS: Record<SettledStatus, AdminOrderTarget[]> = {
  paid: ['preparing', 'shipped'],
  preparing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  expired: [],
  refunded: [],
}

/** Pagos con los que un pedido que espera el pago se puede cancelar. */
const CANCELLABLE: PaymentStatus[] = ['none', 'rejected', 'cancelled']

/** Pagos en curso: el pedido no se cancela hasta que se resuelvan. */
const IN_PROGRESS: PaymentStatus[] = ['pending', 'action_required']

/** Pagos que no están en curso ni permiten cancelar (por ejemplo, uno aprobado). */
const OTHER_PAYMENTS = PAYMENT_STATUSES.filter(
  (payment) => !CANCELLABLE.includes(payment) && !IN_PROGRESS.includes(payment),
)

/** Todos los estados menos `pending_payment`. */
const SETTLED_STATUSES = ORDER_STATUSES.filter(
  (status): status is SettledStatus => status !== 'pending_payment',
)

describe('constantes', () => {
  it('los destinos que ofrece el admin', () => {
    expect(ADMIN_ORDER_TARGETS).toEqual(['preparing', 'shipped', 'delivered', 'cancelled'])
  })
  it('los pagos que permiten cancelar un pedido', () => {
    expect(CANCELLABLE_PAYMENT_STATUSES).toEqual(['none', 'rejected', 'cancelled'])
  })
  it('los pedidos para despachar', () => {
    expect(ORDERS_TO_SHIP_STATUSES).toEqual(['paid', 'preparing'])
  })
  it('los pedidos que cuentan como vendidos', () => {
    expect(SOLD_ORDER_STATUSES).toEqual(['paid', 'preparing', 'shipped', 'delivered'])
  })
})

describe('adminOrderTargets', () => {
  it.each(
    SETTLED_STATUSES.flatMap((status) =>
      PAYMENT_STATUSES.map((payment) => [status, payment, TARGETS_BY_STATUS[status]] as const),
    ),
  )('%s con pago %s ofrece %j', (status, payment, expected) => {
    expect(adminOrderTargets(status, payment)).toEqual(expected)
  })

  it.each(CANCELLABLE)('pending_payment con pago %s solo se puede cancelar', (payment) => {
    expect(adminOrderTargets('pending_payment', payment)).toEqual(['cancelled'])
  })

  it.each([...IN_PROGRESS, ...OTHER_PAYMENTS])(
    'pending_payment con pago %s no ofrece ningún destino',
    (payment) => {
      expect(adminOrderTargets('pending_payment', payment)).toEqual([])
    },
  )

  it('devuelve una lista nueva cada vez', () => {
    const first = adminOrderTargets('paid', 'approved')
    first.push('cancelled')
    expect(adminOrderTargets('paid', 'approved')).toEqual(['preparing', 'shipped'])
  })
})

describe('checkOrderTransition', () => {
  it.each(
    SETTLED_STATUSES.flatMap((status) =>
      ADMIN_ORDER_TARGETS.map(
        (target) =>
          [
            status,
            target,
            TARGETS_BY_STATUS[status].includes(target) ? 'ok' : 'invalid_status_transition',
          ] as const,
      ),
    ),
  )('%s → %s da %s', (status, target, expected) => {
    expect(checkOrderTransition(status, 'approved', target)).toBe(expected)
  })

  it.each(CANCELLABLE)('pending_payment con pago %s se cancela', (payment) => {
    expect(checkOrderTransition('pending_payment', payment, 'cancelled')).toBe('ok')
  })

  it.each(IN_PROGRESS)(
    'pending_payment con pago %s no se cancela: hay un pago en curso',
    (payment) => {
      expect(checkOrderTransition('pending_payment', payment, 'cancelled')).toBe(
        'payment_in_progress',
      )
    },
  )

  it.each(OTHER_PAYMENTS)(
    'pending_payment con pago %s no se cancela: la transición no es válida',
    (payment) => {
      expect(checkOrderTransition('pending_payment', payment, 'cancelled')).toBe(
        'invalid_status_transition',
      )
    },
  )

  it.each(
    PAYMENT_STATUSES.flatMap((payment) =>
      (['preparing', 'shipped', 'delivered'] as const).map((target) => [payment, target] as const),
    ),
  )('pending_payment con pago %s no pasa a %s', (payment, target) => {
    expect(checkOrderTransition('pending_payment', payment, target)).toBe(
      'invalid_status_transition',
    )
  })

  it('un pedido pagado no se cancela, ni con un pago en curso', () => {
    expect(checkOrderTransition('paid', 'approved', 'cancelled')).toBe('invalid_status_transition')
    expect(checkOrderTransition('paid', 'pending', 'cancelled')).toBe('invalid_status_transition')
  })
})

describe('validación', () => {
  it('rechaza un estado del pedido desconocido', () => {
    expect(() => adminOrderTargets('lost' as OrderStatus, 'none')).toThrow(
      new RangeError('Estado de pedido desconocido: "lost".'),
    )
    expect(() => checkOrderTransition('lost' as OrderStatus, 'none', 'cancelled')).toThrow(
      RangeError,
    )
  })
  it('rechaza un estado del pago desconocido', () => {
    expect(() => adminOrderTargets('paid', 'paid' as PaymentStatus)).toThrow(
      new RangeError('Estado de pago desconocido: "paid".'),
    )
  })
  it('rechaza un destino que el admin no ofrece', () => {
    expect(() => checkOrderTransition('paid', 'approved', 'paid' as AdminOrderTarget)).toThrow(
      new RangeError('Destino de pedido desconocido: "paid".'),
    )
  })
})
