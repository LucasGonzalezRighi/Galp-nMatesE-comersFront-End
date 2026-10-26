import { z } from 'zod'
import {
  cartTotals,
  formatPesos,
  ORDER_RESERVATION_MINUTES,
  PAYMENT_METHODS,
  pesos,
} from '@galpon/domain'
import { checkoutContactSchema, shippingSchema } from '@galpon/schemas'
import type { ChangeNotice, OrderShipping } from '../../generated/schema'
import type { MockRoute } from '../router'
import type { MockOrder } from '../types'
import { json, problem, ResponseError, validationProblem } from '../http'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { orderNumberParam, parseOrFail, withoutNulls } from '../validation'
import { currentCustomer } from './customer-session'
import {
  expireOrders,
  findOrderByToken,
  IDEMPOTENCY_TTL_MS,
  idempotencyKey,
  idempotencyKeyReused,
  nextOrderNumber,
  orderNotFound,
  sha256Hex,
  stableStringify,
  toOrder,
} from './order-state'
import { cartItemsSchema, priceCart, priceChanges, stockChanges } from './pricing'

/** Cuerpo de `POST /orders`, con los `null` ya quitados. */
const createOrderSchema = z.object({
  customer: checkoutContactSchema,
  shipping: shippingSchema,
  items: cartItemsSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  expectedTotalArs: z.int().min(0),
  website: z.string().optional(),
})

/** Pedido ya validado. */
type CreateOrder = z.output<typeof createOrderSchema>

/**
 * Corta la creación con un `409`: el front muestra `changes` y no cobra.
 *
 * @param type - `stock_changed`, `price_changed` o `total_changed`.
 * @param title - Resumen corto.
 * @param changes - Qué cambió.
 */
function conflict(type: string, title: string, changes: ChangeNotice[]): ResponseError {
  return new ResponseError(
    problem(409, title, {
      type,
      detail: 'El pedido cambió desde que armaste el resumen. Revisalo antes de pagar.',
      changes,
    }),
  )
}

/** Envío del pedido con la dirección que pide su método. */
function orderShipping(
  shipping: CreateOrder['shipping'],
  option: { costArs: number; eta: string },
): OrderShipping {
  const { costArs, eta } = option
  switch (shipping.method) {
    case 'home':
      return {
        method: 'home',
        address: { ...shipping.address, apartment: shipping.address.apartment ?? null },
        costArs,
        eta,
      }
    case 'branch':
      return { method: 'branch', address: shipping.address, costArs, eta }
    case 'pickup':
      return { method: 'pickup', address: null, costArs, eta }
  }
}

/** Rutas de pedidos: crear un pedido y consultarlo. */
export const ordersRoutes: readonly MockRoute[] = [
  route('POST', '/orders', async (ctx) => {
    const key = idempotencyKey(ctx)
    const body = await ctx.body<unknown>()
    const orderToken = `${randomUuid()}${randomUuid()}`.replaceAll('-', '')
    const tokenHash = await sha256Hex(orderToken)
    // Desde acá no hay más esperas: dos pedidos con la misma clave no se cruzan.
    const { db, now } = ctx
    expireOrders(db, now)
    const fingerprint = stableStringify(body)
    const previous = db.orders.find(
      (order) =>
        order.creation.idempotencyKey === key &&
        Date.parse(order.creation.expiresAt) > now.getTime(),
    )
    if (previous !== undefined) {
      return previous.creation.fingerprint === fingerprint
        ? json({ order: toOrder(previous), orderToken: previous.creation.orderToken }, 201)
        : idempotencyKeyReused()
    }

    const input = parseOrFail(createOrderSchema, withoutNulls(body))
    const option = db.settings.shippingOptions.find(
      (candidate) => candidate.method === input.shipping.method,
    )
    if (option?.enabled !== true) {
      throw new ResponseError(
        validationProblem([
          {
            field: 'shipping.method',
            code: 'unavailable',
            message: 'Ese método de envío no está disponible.',
          },
        ]),
      )
    }
    const priced = priceCart(db, input.items, now)
    const stock = stockChanges(priced.lines)
    if (stock.length > 0) throw conflict('stock_changed', 'El stock cambió', stock)
    const prices = priceChanges(priced.lines)
    if (prices.length > 0) throw conflict('price_changed', 'Cambiaron los precios', prices)
    const amounts = priced.lines.flatMap((line) => (line.amounts === null ? [] : [line.amounts]))
    const totals = cartTotals(amounts, pesos(option.costArs))
    if (totals.totalArs !== input.expectedTotalArs) {
      throw conflict('total_changed', 'El total cambió', [
        {
          kind: 'price',
          productId: null,
          message: `El total cambió de ${formatPesos(pesos(input.expectedTotalArs))} a ${formatPesos(totals.totalArs)}.`,
        },
      ])
    }

    const createdAt = now.toISOString()
    const order: MockOrder = {
      number: nextOrderNumber(db),
      tokenHash,
      creation: {
        idempotencyKey: key,
        fingerprint,
        orderToken,
        expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS).toISOString(),
      },
      ownerId: currentCustomer(ctx)?.id ?? null,
      status: 'pending_payment',
      customer: { ...input.customer, phone: input.customer.phone ?? null },
      shipping: orderShipping(input.shipping, option),
      lines: priced.lines.flatMap((line) => (line.orderLine === null ? [] : [line.orderLine])),
      itemsGrossArs: totals.itemsGrossArs,
      kitSavingsArs: totals.kitSavingsArs,
      subtotalArs: totals.subtotalArs,
      shippingArs: option.costArs,
      totalArs: totals.totalArs,
      paymentMethod: input.paymentMethod,
      intents: [],
      reservation: priced.reservation,
      tracking: null,
      history: [{ status: 'pending_payment', at: createdAt, note: null }],
      reservedUntil: new Date(now.getTime() + ORDER_RESERVATION_MINUTES * 60_000).toISOString(),
      createdAt,
    }
    // Con el campo trampa lleno se responde como si nada, pero no se guarda (contrato, `Honeypot`).
    if (input.website === undefined || input.website === '') db.orders.push(order)
    return json({ order: toOrder(order), orderToken }, 201)
  }),

  route('GET', '/orders/{number}', async (ctx) => {
    const number = orderNumberParam(ctx.params)
    const byToken = await findOrderByToken(ctx, number)
    expireOrders(ctx.db, ctx.now)
    const ownerId = currentCustomer(ctx)?.id
    const order =
      byToken ??
      ctx.db.orders.find(
        (candidate) =>
          candidate.number === number && ownerId !== undefined && candidate.ownerId === ownerId,
      )
    if (order === undefined) throw orderNotFound()
    return json(toOrder(order))
  }),
]
