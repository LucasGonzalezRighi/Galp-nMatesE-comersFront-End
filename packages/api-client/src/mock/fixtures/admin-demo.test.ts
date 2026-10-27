import { describe, expect, it } from 'vitest'
import { cartTotals, ORDER_RESERVATION_MINUTES, pesos } from '@galpon/domain'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from '../db'
import { nextOrderNumber, toOrder } from '../handlers/order-state'
import { createPersistentMockDb } from '../storage'
import { FIXTURE_ADMIN_DEMO } from './admin-demo'

const NOW = new Date('2026-10-27T15:00:00Z')
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

function demoDb(now = NOW) {
  return createMockDb({ ...DEFAULT_MOCK_DB_OPTIONS, demo: 'admin', now })
}

function minutesBefore(iso: string, now = NOW): number {
  return (now.getTime() - Date.parse(iso)) / MINUTE
}

describe('datos de demostración del admin', () => {
  it('sin demo no siembra pedidos, mensajes ni reseñas nuevas', () => {
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    expect(db.orders).toEqual([])
    expect(db.messages).toEqual([])
    expect(db.reviews).toHaveLength(13)
  })

  it('rechaza un demo desconocido o una fecha inválida', () => {
    expect(() =>
      createMockDb({ ...DEFAULT_MOCK_DB_OPTIONS, demo: 'tienda' as never, now: NOW }),
    ).toThrow(RangeError)
    expect(() =>
      createMockDb({ ...DEFAULT_MOCK_DB_OPTIONS, demo: 'admin', now: new Date('x') }),
    ).toThrow(/fecha/)
  })

  it('siembra los 12 pedidos de la tabla con su estado y su pago', () => {
    const orders = demoDb().orders.map(toOrder)
    expect(orders.map((order) => [order.number, order.status, order.paymentStatus])).toEqual([
      ['GLP-09001', 'paid', 'approved'],
      ['GLP-09002', 'paid', 'approved'],
      ['GLP-09003', 'preparing', 'approved'],
      ['GLP-09004', 'shipped', 'approved'],
      ['GLP-09005', 'delivered', 'approved'],
      ['GLP-09006', 'pending_payment', 'none'],
      ['GLP-09007', 'pending_payment', 'pending'],
      ['GLP-09008', 'expired', 'none'],
      ['GLP-09009', 'cancelled', 'none'],
      ['GLP-09010', 'refunded', 'refunded'],
      ['GLP-09011', 'delivered', 'charged_back'],
      ['GLP-09012', 'shipped', 'in_dispute'],
    ])
    expect(FIXTURE_ADMIN_DEMO.orders).toHaveLength(12)
  })

  it('arma las fechas a partir de now', () => {
    const later = new Date(NOW.getTime() + 3 * DAY)
    const db = demoDb(later)
    const byNumber = (number: string) => {
      const order = db.orders.find((candidate) => candidate.number === number)
      if (order === undefined) throw new Error(number)
      return order
    }
    const paidAt = (number: string) =>
      byNumber(number).history.find((entry) => entry.status === 'paid')?.at ?? ''
    expect(minutesBefore(paidAt('GLP-09001'), later)).toBe(1)
    expect(minutesBefore(paidAt('GLP-09002'), later)).toBe(2)
    const pending = byNumber('GLP-09006')
    expect(minutesBefore(pending.createdAt, later)).toBe(10)
    expect(minutesBefore(pending.reservedUntil, later)).toBe(-20)
    expect(Date.parse(pending.reservedUntil) - Date.parse(pending.createdAt)).toBe(
      ORDER_RESERVATION_MINUTES * MINUTE,
    )
    for (const order of db.orders) {
      expect(Date.parse(order.createdAt)).toBeLessThan(later.getTime())
      expect(order.history[0]).toMatchObject({ status: 'pending_payment', at: order.createdAt })
      expect(order.history.at(-1)?.status).toBe(order.status)
    }
  })

  it('cada pedido trae sus detalles de la tabla', () => {
    const db = demoDb()
    const orders = new Map(db.orders.map((order) => [order.number, order]))
    const get = (number: string) => {
      const order = orders.get(number)
      if (order === undefined) throw new Error(number)
      return order
    }
    const first = toOrder(get('GLP-09001'))
    expect(first.payment).toMatchObject({
      method: 'card',
      installments: 3,
      lastFour: '4242',
      paymentTypeId: 'credit_card',
    })
    expect(first.shipping).toMatchObject({ method: 'home', address: { province: 'CABA' } })

    const duplicate = get('GLP-09002')
    expect(duplicate.intents.filter((intent) => intent.status === 'approved')).toHaveLength(2)
    expect(toOrder(duplicate).payment).toMatchObject({
      method: 'mp_redirect',
      paymentTypeId: 'account_money',
    })
    expect(duplicate.shipping.method).toBe('pickup')
    expect(orders.get('GLP-09003')?.shipping.method).toBe('branch')
    expect(orders.get('GLP-09004')?.tracking).toEqual({
      carrier: 'Andreani',
      number: 'AND123456789',
    })
    expect(orders.get('GLP-09006')?.reservation.length).toBeGreaterThan(0)
    expect(orders.get('GLP-09007')?.reservation.length).toBeGreaterThan(0)
    expect(orders.get('GLP-09009')?.history.at(-1)).toMatchObject({
      status: 'cancelled',
      note: 'Pedido de prueba cancelado',
    })
    for (const number of ['GLP-09001', 'GLP-09002', 'GLP-09003', 'GLP-09008', 'GLP-09009']) {
      expect(orders.get(number)?.reservation).toEqual([])
    }
  })

  it('los importes salen de cartTotals con el costo del envío', () => {
    for (const order of demoDb().orders) {
      expect(order.lines.length).toBeGreaterThan(0)
      const totals = cartTotals(
        order.lines.map((line) => ({
          grossArs: pesos(line.unitPriceArs * line.quantity),
          savingsArs: pesos(line.kitSavingsArs),
          totalArs: pesos(line.totalArs),
        })),
        pesos(order.shippingArs),
      )
      expect(order.totalArs).toBe(totals.totalArs)
      expect(order.subtotalArs + order.shippingArs).toBe(order.totalArs)
    }
  })

  it('no toca el stock de los productos y los pedidos nuevos no chocan con los de la demo', () => {
    const db = demoDb()
    expect(db.products).toEqual(createMockDb(DEFAULT_MOCK_DB_OPTIONS).products)
    expect(nextOrderNumber(db)).toBe('GLP-10001')
  })

  it('siembra 8 mensajes: 5 de contacto y 3 arrepentimientos, 3 sin leer', () => {
    const { messages } = demoDb()
    expect(messages.map((message) => message.id)).toEqual(
      Array.from({ length: 8 }, (_, index) => `msg-000${String(index + 1)}`),
    )
    expect(messages.filter((message) => message.kind === 'contact')).toHaveLength(5)
    const withdrawals = messages.filter((message) => message.kind === 'withdrawal')
    expect(withdrawals.map((message) => message.code)).toEqual([
      'ARR-000001',
      'ARR-000002',
      'ARR-000003',
    ])
    expect(withdrawals.every((message) => message.reason === null)).toBe(true)
    const unread = messages.filter((message) => !message.read)
    expect(unread.map((message) => message.kind).sort()).toEqual([
      'contact',
      'contact',
      'withdrawal',
    ])
    const times = messages.map((message) => Date.parse(message.createdAt))
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('siembra 5 reseñas nuevas sobre productos que existen: 4 pendientes y 1 oculta', () => {
    const db = demoDb()
    const added = db.reviews.slice(13)
    expect(added).toHaveLength(5)
    expect(added.map((review) => review.status).sort()).toEqual([
      'hidden',
      'pending',
      'pending',
      'pending',
      'pending',
    ])
    const productIds = new Set(db.products.map((product) => product.id))
    expect(added.every((review) => productIds.has(review.productId))).toBe(true)
    expect(added.every((review) => !review.featured)).toBe(true)
    expect(added.every((review) => Date.parse(review.createdAt) < NOW.getTime())).toBe(true)
  })

  it('createPersistentMockDb siembra la demo y la vuelve a sembrar al reiniciar', () => {
    const handle = createPersistentMockDb({
      ...DEFAULT_MOCK_DB_OPTIONS,
      demo: 'admin',
      now: NOW,
      storage: null,
      key: 'demo',
    })
    expect(handle.db.orders).toHaveLength(12)
    handle.db.orders = []
    handle.reset()
    expect(handle.db.orders).toHaveLength(12)
    expect(handle.db.messages).toHaveLength(8)
  })
})
