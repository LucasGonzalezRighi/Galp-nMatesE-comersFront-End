import { z } from 'zod'
import type { PaymentStatus, Pesos } from '@galpon/domain'
import { formatPercentAr, formatPesos, installmentAmount, pesos } from '@galpon/domain'
import { emailSchema } from '@galpon/schemas'
import type { CardPaymentResult, InstallmentOption } from '../../generated/schema'
import type { MockCardHolder } from '../card-token'
import type { MockContext, MockRoute } from '../router'
import type { MockOrder, MockPaymentIntent } from '../types'
import { parseMockCardToken } from '../card-token'
import { json, noContent, ResponseError, validationProblem } from '../http'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { orderNumberParam, parseOrFail } from '../validation'
import {
  assertPayable,
  cancelActiveIntents,
  expireOrders,
  findOrderByToken,
  idempotencyKey,
  idempotencyKeyReused,
  markPaid,
  orderNotFound,
  stableStringify,
} from './order-state'

/**
 * Cuotas con interés que el simulador agrega a las sin interés de los ajustes, con el CFT y la TEA
 * de ejemplo del refinamiento 4 del plan de P3.
 */
const FINANCED_INSTALLMENTS = [6, 12] as const

/** CFT de ejemplo de las cuotas con interés, en porcentaje. */
const EXAMPLE_CFT_PERCENT = 45.9

/** TEA de ejemplo de las cuotas con interés, en porcentaje. */
const EXAMPLE_TEA_PERCENT = 38

/** Resultado del pago con tarjeta según el titular de prueba, como en el sandbox de Mercado Pago. */
const CARD_OUTCOMES: Readonly<
  Record<MockCardHolder, { status: PaymentStatus; statusDetail: string }>
> = {
  APRO: { status: 'approved', statusDetail: 'accredited' },
  CONT: { status: 'pending', statusDetail: 'pending_contingency' },
  OTHE: { status: 'rejected', statusDetail: 'cc_rejected_other_reason' },
  FUND: { status: 'rejected', statusDetail: 'cc_rejected_insufficient_amount' },
  SECU: { status: 'rejected', statusDetail: 'cc_rejected_bad_filled_security_code' },
  EXPI: { status: 'rejected', statusDetail: 'cc_rejected_bad_filled_date' },
  CALL: { status: 'rejected', statusDetail: 'cc_rejected_call_for_authorize' },
  '3DS': { status: 'action_required', statusDetail: 'pending_challenge' },
}

/** Cuerpo de `POST …/card` (los datos que arma MercadoPago.js en el navegador). */
const cardPaymentSchema = z.object({
  token: z.string().min(1).max(255),
  paymentMethodId: z.string().min(1).max(50),
  issuerId: z.string().min(1).max(50).nullable(),
  installments: z.int().min(1).max(24),
  payer: z.object({
    email: emailSchema,
    identification: z.object({
      type: z.string().min(1).max(20),
      number: z.string().regex(/^[A-Za-z0-9]{5,20}$/, 'Ingresá el número de documento.'),
    }),
  }),
})

/** Cuerpo de `POST …/installments`. */
const installmentsSchema = z.object({
  bin: z.string().regex(/^\d{6,8}$/, 'Ingresá los primeros 6 a 8 dígitos de la tarjeta.'),
  paymentTypeId: z.enum(['credit_card', 'debit_card']),
})

/** Identificador simulado de un pago de Mercado Pago: 10 dígitos al azar. */
export function mockPaymentId(): string {
  return String(1_000_000_000 + (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0))
}

/**
 * Dirección del simulador de Mercado Pago para una preferencia.
 *
 * @param number - Número del pedido.
 * @param intentId - Identificador del intento.
 */
export function simulatorUrl(number: string, intentId: string): string {
  return `/checkout/mp-simulado?pedido=${encodeURIComponent(number)}&intent=${encodeURIComponent(intentId)}`
}

/** Busca el pedido del token (antes de cualquier cambio) y le aplica los vencimientos. */
async function orderForPayment(ctx: MockContext): Promise<MockOrder> {
  const order = await findOrderByToken(ctx, orderNumberParam(ctx.params))
  expireOrders(ctx.db, ctx.now)
  if (order === undefined) throw orderNotFound()
  return order
}

/** Crea un intento de pago vacío y lo agrega al pedido. */
function addIntent(
  ctx: MockContext,
  order: MockOrder,
  fields: Pick<MockPaymentIntent, 'method' | 'idempotencyKey' | 'fingerprint'> &
    Partial<MockPaymentIntent>,
): MockPaymentIntent {
  const intent: MockPaymentIntent = {
    id: `int-${randomUuid()}`,
    status: 'none',
    statusDetail: null,
    installments: null,
    paymentTypeId: null,
    lastFour: null,
    mpPaymentId: null,
    result: null,
    createdAt: ctx.now.toISOString(),
    ...fields,
  }
  order.intents.push(intent)
  return intent
}

/**
 * Opciones de cuotas del simulador para un total: 1 pago y las cuotas sin interés de los ajustes
 * con CFT 0, más 6 y 12 cuotas con el CFT de ejemplo (sistema francés con la TEA de ejemplo).
 *
 * @param total - Total del pedido.
 * @param maxWithoutInterest - Máximo de cuotas sin interés de los ajustes.
 * @param credit - `false` para débito, que solo admite 1 pago.
 */
export function installmentOptions(
  total: Pesos,
  maxWithoutInterest: number,
  credit: boolean,
): InstallmentOption[] {
  const options: InstallmentOption[] = []
  const free = credit ? maxWithoutInterest : 1
  for (let count = 1; count <= free; count += 1) {
    const amount = installmentAmount(total, count)
    options.push({
      installments: count,
      installmentAmountArs: amount,
      totalArs: total,
      cftPercent: 0,
      teaPercent: 0,
      label:
        count === 1
          ? `1 pago de ${formatPesos(amount)}`
          : `${String(count)} cuotas sin interés de ${formatPesos(amount)}`,
    })
  }
  if (!credit) return options
  const monthlyRate = (1 + EXAMPLE_TEA_PERCENT / 100) ** (1 / 12) - 1
  for (const count of FINANCED_INSTALLMENTS) {
    if (count <= maxWithoutInterest) continue
    const financed = pesos(
      Math.round((total * count * monthlyRate) / (1 - (1 + monthlyRate) ** -count)),
    )
    const amount = installmentAmount(financed, count)
    options.push({
      installments: count,
      installmentAmountArs: amount,
      totalArs: financed,
      cftPercent: EXAMPLE_CFT_PERCENT,
      teaPercent: EXAMPLE_TEA_PERCENT,
      label: `${String(count)} cuotas de ${formatPesos(amount)} (CFT ${formatPercentAr(EXAMPLE_CFT_PERCENT)})`,
    })
  }
  return options
}

/** Rutas de pagos: preferencia de Mercado Pago, tarjeta, cuotas y cancelación del intento. */
export const paymentsRoutes: readonly MockRoute[] = [
  route('POST', '/orders/{number}/payments/mercadopago/preference', async (ctx) => {
    const key = idempotencyKey(ctx)
    const order = await orderForPayment(ctx)
    const previous = order.intents.find((intent) => intent.idempotencyKey === key)
    if (previous !== undefined) {
      return previous.method === 'mp_redirect'
        ? json({ initPoint: simulatorUrl(order.number, previous.id) })
        : idempotencyKeyReused()
    }
    assertPayable(order)
    cancelActiveIntents(order)
    const intent = addIntent(ctx, order, {
      method: 'mp_redirect',
      idempotencyKey: key,
      fingerprint: '',
    })
    return json({ initPoint: simulatorUrl(order.number, intent.id) })
  }),

  route('POST', '/orders/{number}/payments/mercadopago/card', async (ctx) => {
    const key = idempotencyKey(ctx)
    const body = await ctx.body<unknown>()
    const order = await orderForPayment(ctx)
    const fingerprint = stableStringify(body)
    const previous = order.intents.find((intent) => intent.idempotencyKey === key)
    if (previous !== undefined) {
      return previous.method === 'card' && previous.fingerprint === fingerprint
        ? json(previous.result)
        : idempotencyKeyReused()
    }
    assertPayable(order)
    const input = parseOrFail(cardPaymentSchema, body)
    const token = parseMockCardToken(input.token)
    const offered = installmentOptions(
      pesos(order.totalArs),
      ctx.db.settings.installments.maxWithoutInterest,
      true,
    ).map((option) => option.installments)
    if (token === null || !offered.includes(input.installments)) {
      throw new ResponseError(
        validationProblem([
          token === null
            ? {
                field: 'token',
                code: 'invalid_token',
                message: 'El token de la tarjeta no es válido. Volvé a cargar la tarjeta.',
              }
            : {
                field: 'installments',
                code: 'invalid_value',
                message: 'Esa cantidad de cuotas no está disponible para esta tarjeta.',
              },
        ]),
      )
    }

    cancelActiveIntents(order)
    const { status, statusDetail } = CARD_OUTCOMES[token.holder]
    const result: CardPaymentResult = {
      paymentStatus: status,
      statusDetail,
      challenge:
        status === 'action_required'
          ? { url: `/checkout/mp-simulado?pedido=${encodeURIComponent(order.number)}&challenge=1` }
          : null,
    }
    addIntent(ctx, order, {
      method: 'card',
      idempotencyKey: key,
      fingerprint,
      status,
      statusDetail,
      installments: input.installments,
      paymentTypeId: 'credit_card',
      lastFour: token.lastFour,
      mpPaymentId: mockPaymentId(),
      result,
    })
    if (status === 'approved') markPaid(ctx, order)
    return json(result)
  }),

  route('POST', '/orders/{number}/payments/mercadopago/installments', async (ctx) => {
    const body = await ctx.body<unknown>()
    const order = await orderForPayment(ctx)
    assertPayable(order)
    const input = parseOrFail(installmentsSchema, body)
    return json(
      installmentOptions(
        pesos(order.totalArs),
        ctx.db.settings.installments.maxWithoutInterest,
        input.paymentTypeId === 'credit_card',
      ),
    )
  }),

  route('POST', '/orders/{number}/cancel-payment', async (ctx) => {
    const order = await orderForPayment(ctx)
    assertPayable(order)
    cancelActiveIntents(order)
    return noContent()
  }),
]
