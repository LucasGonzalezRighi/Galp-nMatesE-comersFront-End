import type { OrderStatus } from '@galpon/domain'
import {
  checkOrderTransition,
  formatPesos,
  isWithinLastArDays,
  matchesSearch,
  ORDER_STATUSES,
  ORDERS_TO_SHIP_STATUSES,
  PAYMENT_STATUSES,
  pesos,
  SOLD_ORDER_STATUSES,
  sumPesos,
} from '@galpon/domain'
import { orderStatusChangeSchema } from '@galpon/schemas'
import type { DashboardSummary } from '../../generated/schema'
import type { MockContext, MockRoute } from '../router'
import type { MockDb, MockOrder } from '../types'
import { json, notFound, problem, ResponseError } from '../http'
import { route } from '../router'
import { orderNumberParam, parseOrFail, QueryReader } from '../validation'
import { requireAdmin } from './admin-auth'
import { cancelActiveIntents, expireOrders, toOrder } from './order-state'

/** Pedidos por página en el listado del dashboard. */
export const ADMIN_ORDERS_PAGE_SIZE = 20

/** Cómo está un pedido, para el detalle de un `409 invalid_status_transition`. */
const STATUS_TEXT: Record<OrderStatus, string> = {
  pending_payment: 'esperando el pago',
  paid: 'pagado',
  preparing: 'en preparación',
  shipped: 'despachado',
  delivered: 'entregado',
  cancelled: 'cancelado',
  expired: 'vencido',
  refunded: 'devuelto',
}

/** Alerta de pago del resumen. */
type PaymentAlert = DashboardSummary['paymentAlerts'][number]

/** Momento en que el pedido pasó a `paid` según su historial, o `undefined` si nunca pasó. */
function paidAt(order: MockOrder): string | undefined {
  return order.history.find((entry) => entry.status === 'paid')?.at
}

/** Indica si el pedido está en una lista de estados. */
function isIn(order: MockOrder, statuses: readonly OrderStatus[]): boolean {
  return statuses.includes(order.status)
}

/**
 * Alertas de pago de un pedido: contracargo, mediación abierta o un segundo pago aprobado.
 *
 * @param order - Pedido de la base.
 */
function paymentAlertsOf(order: MockOrder): PaymentAlert[] {
  const total = formatPesos(pesos(order.totalArs))
  const { number: orderNumber } = order
  const alerts: PaymentAlert[] = []
  const { paymentStatus } = toOrder(order)
  if (paymentStatus === 'charged_back') {
    alerts.push({
      orderNumber,
      kind: 'charged_back',
      message: `Contracargo por ${total}: el cliente desconoció el pago. Revisalo en Mercado Pago.`,
    })
  }
  if (paymentStatus === 'in_dispute') {
    alerts.push({
      orderNumber,
      kind: 'in_dispute',
      message: `Mediación abierta por ${total}. Respondé desde Mercado Pago.`,
    })
  }
  if (order.intents.filter((intent) => intent.status === 'approved').length >= 2) {
    alerts.push({
      orderNumber,
      kind: 'duplicate_payment',
      message: `Se aprobó un segundo pago de ${total}. Devolvelo desde Mercado Pago.`,
    })
  }
  return alerts
}

/** Pedidos del más nuevo al más viejo. */
function newestFirst(orders: readonly MockOrder[]): MockOrder[] {
  return [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/**
 * Arma el resumen del dashboard a partir de la base, ya con los vencimientos al día.
 *
 * - Ventas: suma de los pedidos vendidos (`SOLD_ORDER_STATUSES`) cuyo paso a `paid` es de hoy o de
 *   los últimos 7 días de Buenos Aires.
 * - Poco stock: publicados con stock hasta `lowStockThreshold`, de menor a mayor y por nombre.
 *
 * @param db - Base simulada.
 * @param now - Momento del pedido.
 */
function dashboardSummary(db: MockDb, now: Date): DashboardSummary {
  const sold = db.orders.flatMap((order) => {
    const at = paidAt(order)
    return at !== undefined && isIn(order, SOLD_ORDER_STATUSES) ? [{ order, at }] : []
  })
  const salesWithin = (days: number) =>
    sumPesos(
      sold
        .filter(({ at }) => isWithinLastArDays(at, now, days))
        .map(({ order }) => pesos(order.totalArs)),
    )
  const { lowStockThreshold } = db.settings
  return {
    salesTodayArs: salesWithin(1),
    salesLast7DaysArs: salesWithin(7),
    ordersToShip: db.orders.filter((order) => isIn(order, ORDERS_TO_SHIP_STATUSES)).length,
    lowStock: db.products
      .filter((product) => product.status === 'published' && product.stock <= lowStockThreshold)
      .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, 'es'))
      .map(({ id, name, stock }) => ({ id, name, stock })),
    pendingReviews: db.reviews.filter((review) => review.status === 'pending').length,
    unreadMessages: db.messages.filter((message) => !message.read).length,
    paymentAlerts: newestFirst(db.orders).flatMap(paymentAlertsOf),
  }
}

/** Busca el pedido de la ruta (`{number}`), ya con los vencimientos al día. */
function findOrder(ctx: MockContext): MockOrder {
  const number = orderNumberParam(ctx.params)
  expireOrders(ctx.db, ctx.now)
  const order = ctx.db.orders.find((candidate) => candidate.number === number)
  if (order === undefined) throw new ResponseError(notFound('No existe ese pedido.'))
  return order
}

/**
 * Rutas del dashboard para pedidos y el resumen: el resumen del inicio, el listado con filtros, el
 * detalle y el cambio de estado.
 *
 * Todas corren `expireOrders` antes de leer. El cambio de estado sigue `checkOrderTransition` de
 * `@galpon/domain` (`409 invalid_status_transition` o `payment_in_progress`): deja la nota en el
 * historial, guarda el seguimiento al despachar y, al cancelar, libera la reserva de stock y
 * cancela el intento de pago activo.
 */
export const adminOrdersRoutes: readonly MockRoute[] = [
  route('GET', '/admin/dashboard/summary', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    expireOrders(ctx.db, ctx.now)
    return json(dashboardSummary(ctx.db, ctx.now))
  }),

  route('GET', '/admin/orders', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    const reader = new QueryReader(ctx.query)
    const page = reader.integer('page', 'La página', { min: 1 }, 1)
    const paymentStatus = reader.oneOf('paymentStatus', 'El estado del pago', PAYMENT_STATUSES)
    const search = reader.text('q', 100)
    const statuses = reader.manyOf('status', 'El estado', ORDER_STATUSES)
    reader.assertValid()

    expireOrders(ctx.db, ctx.now)
    const matching = newestFirst(ctx.db.orders)
      .map((order) => ({ order, summary: toOrder(order) }))
      .filter(({ order, summary }) => {
        if (statuses.length > 0 && !statuses.includes(order.status)) return false
        if (paymentStatus !== undefined && summary.paymentStatus !== paymentStatus) return false
        const { firstName, lastName, email } = order.customer
        return (
          search === undefined || matchesSearch(search, [order.number, firstName, lastName, email])
        )
      })
    const start = (page - 1) * ADMIN_ORDERS_PAGE_SIZE
    return json({
      items: matching.slice(start, start + ADMIN_ORDERS_PAGE_SIZE).map(({ summary }) => summary),
      page,
      pageSize: ADMIN_ORDERS_PAGE_SIZE,
      total: matching.length,
    })
  }),

  route('GET', '/admin/orders/{number}', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    return json(toOrder(findOrder(ctx)))
  }),

  route('POST', '/admin/orders/{number}/status', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const body = await ctx.body()
    const order = findOrder(ctx)
    const change = parseOrFail(orderStatusChangeSchema, body)
    const check = checkOrderTransition(order.status, toOrder(order).paymentStatus, change.status)
    if (check === 'payment_in_progress') {
      throw new ResponseError(
        problem(409, 'Hay un pago en curso', {
          type: 'payment_in_progress',
          detail: 'Hay un pago en curso: esperá a que se resuelva para cancelar el pedido.',
        }),
      )
    }
    if (check === 'invalid_status_transition') {
      throw new ResponseError(
        problem(409, 'Transición inválida', {
          type: 'invalid_status_transition',
          detail: `El pedido está ${STATUS_TEXT[order.status]}: no puede pasar a ${STATUS_TEXT[change.status]}.`,
        }),
      )
    }

    order.status = change.status
    order.history.push({ status: change.status, at: ctx.now.toISOString(), note: change.note })
    if (change.status === 'shipped') {
      order.tracking = { carrier: change.carrier, number: change.trackingNumber }
    }
    if (change.status === 'cancelled') {
      order.reservation = []
      cancelActiveIntents(order)
      ctx.invalidate(['products'])
    }
    return json(toOrder(order))
  }),
]
