import type { PaymentStatus } from '@galpon/domain'
import type { Order, OrderSummary } from '../../generated/schema'
import type { MockContext } from '../router'
import type { MockDb, MockOrder } from '../types'
import { notFound, problem, ResponseError, validationProblem } from '../http'

/** Cuánto se recuerda la respuesta de una `Idempotency-Key`: 24 horas, como dice el contrato. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000

/** Cabecera con la clave de idempotencia. */
const IDEMPOTENCY_HEADER = 'Idempotency-Key'

/** Cabecera con el token del pedido. */
const ORDER_TOKEN_HEADER = 'X-Order-Token'

/** Formato de un UUID en texto. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Primer número de pedido que entrega la base simulada. */
const FIRST_ORDER_NUMBER = 10001

/** Último número de pedido posible (`GLP-99999`). */
const LAST_ORDER_NUMBER = 99999

/** Estados de un intento de pago que todavía puede terminar en un cobro. */
const ACTIVE_INTENT_STATUSES: readonly PaymentStatus[] = ['none', 'pending', 'action_required']

/**
 * Serializa un valor como JSON con las claves de cada objeto ordenadas, para comparar dos cuerpos
 * sin que importe el orden en que vinieron los campos.
 *
 * @param value - Valor a serializar.
 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, field]) => field !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, field]) => `${JSON.stringify(key)}:${stableStringify(field)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/**
 * SHA-256 de un texto en hexadecimal, con Web Crypto (sirve en Node y en el navegador).
 *
 * @param text - Texto a resumir.
 */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Lee la `Idempotency-Key` del pedido.
 *
 * @param ctx - Contexto del pedido.
 * @returns La clave, un UUID.
 * @throws {ResponseError} Con `422` si falta o no es un UUID.
 */
export function idempotencyKey(ctx: MockContext): string {
  const key = ctx.request.headers.get(IDEMPOTENCY_HEADER)?.trim() ?? ''
  if (!UUID_PATTERN.test(key)) {
    throw new ResponseError(
      validationProblem([
        {
          field: IDEMPOTENCY_HEADER,
          code: key === '' ? 'required' : 'invalid_format',
          message: 'Falta la cabecera Idempotency-Key o no es un UUID.',
        },
      ]),
    )
  }
  return key.toLowerCase()
}

/**
 * Respuesta `422` de una `Idempotency-Key` que ya se usó con otro cuerpo.
 */
export function idempotencyKeyReused(): Response {
  return problem(422, 'La clave ya se usó', {
    type: 'idempotency_key_reused',
    detail: 'La Idempotency-Key ya se usó con otros datos. Generá una nueva para este intento.',
  })
}

/**
 * Próximo número de pedido: `GLP-` y el número que sigue al mayor ya entregado.
 *
 * @param db - Base simulada.
 * @throws {Error} Si ya se usaron todos los números.
 */
export function nextOrderNumber(db: MockDb): string {
  const last = db.orders.reduce(
    (max, order) => Math.max(max, Number(order.number.slice(4))),
    FIRST_ORDER_NUMBER - 1,
  )
  if (last >= LAST_ORDER_NUMBER) throw new Error('No quedan números de pedido.')
  return `GLP-${String(last + 1)}`
}

/** Indica si un intento de pago todavía está activo. */
function isActive(status: PaymentStatus): boolean {
  return ACTIVE_INTENT_STATUSES.includes(status)
}

/**
 * Cancela el intento de pago activo del pedido, si hay: solo puede haber uno.
 *
 * @param order - Pedido de la base.
 */
export function cancelActiveIntents(order: MockOrder): void {
  for (const intent of order.intents) {
    if (isActive(intent.status)) intent.status = 'cancelled'
  }
}

/**
 * Intento de pago activo del pedido.
 *
 * @param order - Pedido de la base.
 * @returns El intento, o `undefined` si no hay.
 */
export function activeIntent(order: MockOrder): MockOrder['intents'][number] | undefined {
  return order.intents.findLast((intent) => isActive(intent.status))
}

/**
 * Marca vencidos los pedidos que llegaron a `reservedUntil` sin pago: liberan el stock reservado
 * y se cancela su intento de pago activo. Se corre al empezar cada pedido que lee pedidos.
 *
 * @param db - Base simulada.
 * @param now - Momento del pedido.
 */
export function expireOrders(db: MockDb, now: Date): void {
  for (const order of db.orders) {
    if (order.status !== 'pending_payment') continue
    if (Date.parse(order.reservedUntil) > now.getTime()) continue
    order.status = 'expired'
    order.reservation = []
    cancelActiveIntents(order)
    order.history.push({ status: 'expired', at: order.reservedUntil, note: null })
  }
}

/**
 * Marca el pedido como pagado: descuenta del stock lo reservado y vacía la reserva.
 *
 * @param ctx - Contexto del pedido (avisa que cambió el stock del catálogo).
 * @param order - Pedido de la base.
 */
export function markPaid(ctx: MockContext, order: MockOrder): void {
  for (const { productId, quantity } of order.reservation) {
    const product = ctx.db.products.find((candidate) => candidate.id === productId)
    if (product !== undefined) product.stock = Math.max(0, product.stock - quantity)
  }
  order.reservation = []
  order.status = 'paid'
  order.history.push({ status: 'paid', at: ctx.now.toISOString(), note: null })
  ctx.invalidate(['products'])
}

/**
 * Busca un pedido por número y por el token de `X-Order-Token` (se compara su hash).
 *
 * Es asíncrona por el hash: quien la usa la llama antes de leer o cambiar la base, así dos pedidos
 * simultáneos no se cruzan entre la búsqueda y el cambio.
 *
 * @param ctx - Contexto del pedido.
 * @param number - Número del pedido.
 * @returns El pedido, o `undefined` si no existe o el token falta o no corresponde.
 */
export async function findOrderByToken(
  ctx: MockContext,
  number: string,
): Promise<MockOrder | undefined> {
  const token = ctx.request.headers.get(ORDER_TOKEN_HEADER) ?? ''
  if (token === '') return undefined
  const hash = await sha256Hex(token)
  return ctx.db.orders.find((order) => order.number === number && order.tokenHash === hash)
}

/**
 * Error `404` de un pedido que no existe o no es de quien lo pide; es el mismo en todos los casos
 * para no revelar si el número existe.
 */
export function orderNotFound(): ResponseError {
  return new ResponseError(notFound('No encontramos ese pedido.'))
}

/**
 * Exige que el pedido admita un pago nuevo.
 *
 * @param order - Pedido de la base, ya con los vencimientos al día.
 * @throws {ResponseError} Con `409 order_not_payable` si está pagado, vencido o cerrado.
 */
export function assertPayable(order: MockOrder): void {
  if (order.status === 'pending_payment') return
  const detail =
    order.status === 'expired'
      ? 'El pedido venció.'
      : order.status === 'paid'
        ? 'El pedido ya está pagado.'
        : 'El pedido ya no admite pagos.'
  throw new ResponseError(
    problem(409, 'El pedido no admite un pago nuevo', { type: 'order_not_payable', detail }),
  )
}

/**
 * Arma el pedido como lo devuelve la API: el estado y los datos del pago salen del último intento.
 *
 * @param order - Pedido de la base.
 */
export function toOrder(order: MockOrder): Order {
  const intent = order.intents.at(-1)
  return {
    number: order.number,
    status: order.status,
    paymentStatus: intent?.status ?? 'none',
    customer: order.customer,
    shipping: order.shipping,
    lines: order.lines,
    itemsGrossArs: order.itemsGrossArs,
    kitSavingsArs: order.kitSavingsArs,
    subtotalArs: order.subtotalArs,
    shippingArs: order.shippingArs,
    totalArs: order.totalArs,
    payment: {
      method: intent?.method ?? order.paymentMethod,
      installments: intent?.installments ?? null,
      paymentTypeId: intent?.paymentTypeId ?? null,
      lastFour: intent?.lastFour ?? null,
      statusDetail: intent?.statusDetail ?? null,
      mpPaymentId: intent?.mpPaymentId ?? null,
      challenge: null,
    },
    tracking: order.tracking,
    history: order.history,
    reservedUntil: order.reservedUntil,
    createdAt: order.createdAt,
  }
}

/**
 * Arma el pedido como se lista en "Mis pedidos".
 *
 * @param order - Pedido de la base.
 */
export function toOrderSummary(order: MockOrder): OrderSummary {
  return {
    number: order.number,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.intents.at(-1)?.status ?? 'none',
    totalArs: order.totalArs,
    itemCount: order.lines.reduce((total, line) => total + line.quantity, 0),
  }
}
