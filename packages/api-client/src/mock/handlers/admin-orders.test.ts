import { describe, expect, it } from 'vitest'
import { formatPesos, pesos } from '@galpon/domain'
import type { OrderStatusChange } from '../../generated/schema'
import {
  changeOrderStatus,
  getAdminOrder,
  getDashboardSummary,
  listAdminOrders,
  updateAdminMessage,
} from '../../services'
import { createMockApi, rawRequest } from '../../test/mock-api'
import { createAdminDemoApi } from '../test/admin-demo-api'
import { availableStock } from './pricing'

const NO_TRACKING = { carrier: null, trackingNumber: null, note: null } as const

function change(
  status: OrderStatusChange['status'],
  extra: Partial<OrderStatusChange> = {},
): OrderStatusChange {
  return { status, ...NO_TRACKING, ...extra }
}

describe('GET /admin/dashboard/summary', () => {
  it('sin sesión responde 401', async () => {
    await expect(getDashboardSummary(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })

  it('con los datos de demostración da 3 para despachar, 4 reseñas, 3 mensajes y 3 alertas', async () => {
    const mock = await createAdminDemoApi()
    const summary = await getDashboardSummary(mock.api)
    const total = (number: string) => mock.order(number).totalArs
    expect(summary.ordersToShip).toBe(3)
    expect(summary.pendingReviews).toBe(4)
    expect(summary.unreadMessages).toBe(3)
    expect(summary.salesTodayArs).toBe(total('GLP-09001') + total('GLP-09002'))
    expect(summary.salesLast7DaysArs).toBe(
      ['GLP-09001', 'GLP-09002', 'GLP-09003', 'GLP-09004', 'GLP-09005', 'GLP-09012']
        .map(total)
        .reduce((sum, value) => sum + value, 0),
    )
    expect(summary.lowStock).toEqual([
      { id: 'prd-galleta', name: 'Mate Galleta', stock: 0 },
      { id: 'prd-coquito-criollo', name: 'Mate Coquito Criollo', stock: 2 },
    ])
  })

  it('arma las tres alertas de pago con el total formateado', async () => {
    const mock = await createAdminDemoApi()
    const { paymentAlerts } = await getDashboardSummary(mock.api)
    const total = (number: string) => formatPesos(pesos(mock.order(number).totalArs))
    expect(paymentAlerts).toEqual([
      {
        orderNumber: 'GLP-09002',
        kind: 'duplicate_payment',
        message: `Se aprobó un segundo pago de ${total('GLP-09002')}. Devolvelo desde Mercado Pago.`,
      },
      {
        orderNumber: 'GLP-09012',
        kind: 'in_dispute',
        message: `Mediación abierta por ${total('GLP-09012')}. Respondé desde Mercado Pago.`,
      },
      {
        orderNumber: 'GLP-09011',
        kind: 'charged_back',
        message: `Contracargo por ${total('GLP-09011')}: el cliente desconoció el pago. Revisalo en Mercado Pago.`,
      },
    ])
  })

  it('las ventas de hoy siguen el día de Buenos Aires', async () => {
    const now = new Date('2026-10-27T03:01:00Z')
    const mock = await createAdminDemoApi(now)
    const order = mock.order('GLP-09001')
    mock.db.orders = [order]
    order.history = [
      { status: 'pending_payment', at: '2026-10-27T02:50:00Z', note: null },
      { status: 'paid', at: '2026-10-27T02:59:00Z', note: null },
    ]
    let summary = await getDashboardSummary(mock.api)
    expect(summary.salesTodayArs).toBe(0)
    expect(summary.salesLast7DaysArs).toBe(order.totalArs)

    order.history[1] = { status: 'paid', at: '2026-10-27T03:00:00Z', note: null }
    summary = await getDashboardSummary(mock.api)
    expect(summary.salesTodayArs).toBe(order.totalArs)
  })

  it('no cuenta lo pagado hace más de 7 días ni los pedidos que ya no están vendidos', async () => {
    const mock = await createAdminDemoApi()
    const order = mock.order('GLP-09005')
    mock.db.orders = [order]
    order.history = [{ status: 'paid', at: '2026-10-20T15:00:00Z', note: null }]
    expect((await getDashboardSummary(mock.api)).salesLast7DaysArs).toBe(0)
    order.history = [{ status: 'paid', at: '2026-10-21T03:00:00Z', note: null }]
    expect((await getDashboardSummary(mock.api)).salesLast7DaysArs).toBe(order.totalArs)
    order.status = 'refunded'
    expect((await getDashboardSummary(mock.api)).salesLast7DaysArs).toBe(0)
  })

  it('vence las reservas antes de contar', async () => {
    const mock = await createAdminDemoApi()
    mock.advance(26)
    await getDashboardSummary(mock.api)
    expect(mock.order('GLP-09006').status).toBe('expired')
    expect(mock.order('GLP-09007').status).toBe('expired')
  })

  it('leer un mensaje baja unreadMessages', async () => {
    const mock = await createAdminDemoApi()
    const unread = mock.db.messages.find((message) => !message.read)
    if (unread === undefined) throw new Error('Falta un mensaje sin leer')
    await updateAdminMessage(mock.api, unread.id, { read: true })
    expect((await getDashboardSummary(mock.api)).unreadMessages).toBe(2)
  })

  it('sin demo da todo en cero salvo el poco stock', async () => {
    const mock = await createAdminDemoApi(undefined, { demo: false })
    expect(await getDashboardSummary(mock.api)).toMatchObject({
      salesTodayArs: 0,
      salesLast7DaysArs: 0,
      ordersToShip: 0,
      pendingReviews: 0,
      unreadMessages: 0,
      paymentAlerts: [],
    })
  })

  it('poco stock: solo publicados, hasta el umbral, de menor a mayor y por nombre', async () => {
    const mock = await createAdminDemoApi()
    mock.db.settings.lowStockThreshold = 5
    const [first, second, third] = mock.db.products
    if (first === undefined || second === undefined || third === undefined) {
      throw new Error('Faltan productos')
    }
    first.stock = 2
    second.stock = 5
    third.stock = 1
    third.status = 'draft'
    const { lowStock } = await getDashboardSummary(mock.api)
    expect(lowStock).toEqual([
      { id: 'prd-galleta', name: 'Mate Galleta', stock: 0 },
      { id: 'prd-coquito-criollo', name: 'Mate Coquito Criollo', stock: 2 },
      { id: first.id, name: first.name, stock: 2 },
      { id: second.id, name: second.name, stock: 5 },
    ])
  })
})

describe('GET /admin/orders', () => {
  it('sin sesión responde 401', async () => {
    await expect(listAdminOrders(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })

  it('lista del más nuevo al más viejo, de a 20', async () => {
    const mock = await createAdminDemoApi()
    const page = await listAdminOrders(mock.api)
    expect(page).toMatchObject({ page: 1, pageSize: 20, total: 12 })
    expect(page.items.map((order) => order.number)).toEqual([
      'GLP-09001',
      'GLP-09002',
      'GLP-09007',
      'GLP-09006',
      'GLP-09003',
      'GLP-09008',
      'GLP-09004',
      'GLP-09009',
      'GLP-09012',
      'GLP-09005',
      'GLP-09010',
      'GLP-09011',
    ])
    const second = await listAdminOrders(mock.api, { page: 2 })
    expect(second).toMatchObject({ page: 2, total: 12, items: [] })
  })

  it('combina varios estados, el pago y la búsqueda', async () => {
    const mock = await createAdminDemoApi()
    const toShip = await listAdminOrders(mock.api, { status: ['paid', 'preparing'] })
    expect(toShip.items.map((order) => order.number)).toEqual([
      'GLP-09001',
      'GLP-09002',
      'GLP-09003',
    ])
    const shippedInDispute = await listAdminOrders(mock.api, {
      status: ['shipped'],
      paymentStatus: 'in_dispute',
    })
    expect(shippedInDispute.items.map((order) => order.number)).toEqual(['GLP-09012'])
    const both = await listAdminOrders(mock.api, {
      status: ['paid', 'preparing'],
      q: mock.order('GLP-09002').customer.firstName,
    })
    expect(both.items.map((order) => order.number)).toEqual(['GLP-09002'])
  })

  it('busca por email sin distinguir mayúsculas, por número y por nombre y apellido', async () => {
    const mock = await createAdminDemoApi()
    const { customer } = mock.order('GLP-09004')
    const byEmail = await listAdminOrders(mock.api, { q: customer.email.toUpperCase() })
    expect(byEmail.items.map((order) => order.number)).toEqual(['GLP-09004'])
    const byNumber = await listAdminOrders(mock.api, { q: 'glp-09010' })
    expect(byNumber.items.map((order) => order.number)).toEqual(['GLP-09010'])
    const byName = await listAdminOrders(mock.api, {
      q: `${customer.firstName} ${customer.lastName}`,
    })
    expect(byName.items.map((order) => order.number)).toEqual(['GLP-09004'])
  })

  it('responde 422 con un estado o una página que no existen', async () => {
    const mock = await createAdminDemoApi()
    const response = await rawRequest(mock, '/admin/orders?status=paid&status=enviado&page=0')
    expect(response.status).toBe(422)
    const body = (await response.json()) as { errors: { field: string }[] }
    expect(body.errors.map((error) => error.field).sort()).toEqual(['page', 'status'])
  })
})

describe('GET /admin/orders/{number}', () => {
  it('devuelve el pedido completo y 404 si no existe', async () => {
    const mock = await createAdminDemoApi()
    await expect(getAdminOrder(mock.api, 'GLP-09004')).resolves.toMatchObject({
      number: 'GLP-09004',
      status: 'shipped',
      tracking: { carrier: 'Andreani', number: 'AND123456789' },
    })
    await expect(getAdminOrder(mock.api, 'GLP-00001')).rejects.toMatchObject({ status: 404 })
  })

  it('el servicio rechaza un número sin formato', () => {
    expect(() => getAdminOrder(createMockApi().api, 'GLP-1')).toThrow(RangeError)
  })
})

describe('POST /admin/orders/{number}/status', () => {
  it('pide sesión y token CSRF', async () => {
    const mock = await createAdminDemoApi()
    mock.setCsrfToken('otro')
    await expect(
      changeOrderStatus(mock.api, 'GLP-09001', change('preparing')),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      changeOrderStatus(createMockApi().api, 'GLP-09001', change('preparing')),
    ).rejects.toMatchObject({ status: 401 })
  })

  it.each([
    ['GLP-09001', 'preparing'],
    ['GLP-09002', 'shipped'],
    ['GLP-09003', 'shipped'],
    ['GLP-09004', 'delivered'],
    ['GLP-09006', 'cancelled'],
  ] as const)('%s pasa a %s y queda en el historial', async (number, status) => {
    const mock = await createAdminDemoApi()
    const tracking =
      status === 'shipped' ? { carrier: 'Correo Argentino', trackingNumber: 'CA123456' } : {}
    const order = await changeOrderStatus(
      mock.api,
      number,
      change(status, { ...tracking, note: '  Listo  ' }),
    )
    expect(order.status).toBe(status)
    expect(order.history.at(-1)).toEqual({
      status,
      at: '2026-10-27T15:00:00.000Z',
      note: 'Listo',
    })
    if (status === 'shipped') {
      expect(order.tracking).toEqual({ carrier: 'Correo Argentino', number: 'CA123456' })
    }
  })

  it.each([
    ['GLP-09001', 'cancelled'],
    ['GLP-09001', 'delivered'],
    ['GLP-09003', 'preparing'],
    ['GLP-09004', 'shipped'],
    ['GLP-09005', 'cancelled'],
    ['GLP-09008', 'cancelled'],
    ['GLP-09009', 'preparing'],
    ['GLP-09010', 'shipped'],
    ['GLP-09006', 'preparing'],
  ] as const)('%s no puede pasar a %s: 409 invalid_status_transition', async (number, status) => {
    const mock = await createAdminDemoApi()
    const tracking = status === 'shipped' ? { carrier: 'Andreani', trackingNumber: 'AND9999' } : {}
    const before = structuredClone(mock.order(number))
    await expect(
      changeOrderStatus(mock.api, number, change(status, tracking)),
    ).rejects.toMatchObject({
      status: 409,
      kind: 'conflict',
      problem: { type: 'invalid_status_transition' },
    })
    expect(mock.order(number)).toEqual(before)
  })

  it('cancelar un pedido con un pago en curso responde 409 payment_in_progress', async () => {
    const mock = await createAdminDemoApi()
    await expect(
      changeOrderStatus(mock.api, 'GLP-09007', change('cancelled')),
    ).rejects.toMatchObject({ status: 409, problem: { type: 'payment_in_progress' } })
    expect(mock.order('GLP-09007').status).toBe('pending_payment')
  })

  it('despachar dos veces responde 409 la segunda', async () => {
    const mock = await createAdminDemoApi()
    const dispatch = change('shipped', { carrier: 'Andreani', trackingNumber: 'AND000111' })
    await changeOrderStatus(mock.api, 'GLP-09003', dispatch)
    await expect(changeOrderStatus(mock.api, 'GLP-09003', dispatch)).rejects.toMatchObject({
      status: 409,
      problem: { type: 'invalid_status_transition' },
    })
  })

  it('cancelar libera la reserva de stock y cancela el intento activo', async () => {
    const mock = await createAdminDemoApi()
    const order = mock.order('GLP-09006')
    const [reserved] = order.reservation
    if (reserved === undefined) throw new Error('El pedido no reserva stock')
    const product = mock.db.products.find((candidate) => candidate.id === reserved.productId)
    if (product === undefined) throw new Error('Falta el producto')
    const now = new Date('2026-10-27T15:00:00Z')
    expect(availableStock(mock.db, product, now)).toBe(product.stock - reserved.quantity)
    order.intents.push({
      id: 'int-activo',
      method: 'mp_redirect',
      idempotencyKey: '00000000-0000-4000-8000-000000000001',
      fingerprint: '{}',
      status: 'none',
      statusDetail: null,
      installments: null,
      paymentTypeId: null,
      lastFour: null,
      mpPaymentId: null,
      result: null,
      createdAt: now.toISOString(),
    })

    const cancelled = await changeOrderStatus(mock.api, 'GLP-09006', change('cancelled'))
    expect(cancelled).toMatchObject({ status: 'cancelled', paymentStatus: 'cancelled' })
    expect(order.reservation).toEqual([])
    expect(availableStock(mock.db, product, now)).toBe(product.stock)
    expect(mock.invalidated).toContainEqual(['products'])
  })

  it('valida el cuerpo: despachar sin empresa ni seguimiento da 422 por campo', async () => {
    const mock = await createAdminDemoApi()
    const response = await rawRequest(mock, '/admin/orders/GLP-09001/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfOf(mock) },
      body: JSON.stringify(change('shipped')),
    })
    expect(response.status).toBe(422)
    const body = (await response.json()) as { errors: { field: string }[] }
    expect(body.errors.map((error) => error.field)).toEqual(['carrier', 'trackingNumber'])
  })

  it('responde 404 si el pedido no existe', async () => {
    const mock = await createAdminDemoApi()
    await expect(
      changeOrderStatus(mock.api, 'GLP-00002', change('preparing')),
    ).rejects.toMatchObject({ status: 404 })
  })
})

/** Token CSRF de la sesión abierta en la base. */
function csrfOf(mock: { db: { adminSession: { csrfToken: string } | null } }): string {
  return mock.db.adminSession?.csrfToken ?? ''
}
