import { z } from 'zod'
import { isOrderNumber } from '@galpon/domain'
import type { MockRoute } from '../router'
import { json, problem, ResponseError } from '../http'
import { parseOrFail } from '../validation'
import { activeIntent, expireOrders, markPaid, orderNotFound } from './order-state'
import { mockPaymentId } from './payments'

/**
 * Ruta interna del simulador de Mercado Pago, relativa al prefijo de la API (`/api/v1`). No está
 * en el contrato: solo existe en el modo de prueba y la usa la página `/checkout/mp-simulado`.
 */
export const MOCK_MERCADOPAGO_RESOLVE_PATH = '/__mock/mercadopago/resolve'

/** Resultados que se pueden elegir en el simulador. */
export const MOCK_MERCADOPAGO_RESULTS = ['approved', 'pending', 'rejected'] as const

/** Cuerpo del simulador: el pedido, el intento (o `null` para el activo) y el resultado. */
const resolveSchema = z.object({
  number: z
    .string()
    .refine(isOrderNumber, 'El número de pedido tiene que ser GLP- y cinco dígitos.'),
  intent: z.string().min(1).max(80).nullable(),
  result: z.enum(MOCK_MERCADOPAGO_RESULTS),
})

/** Pedido al simulador de Mercado Pago. */
export type MockMercadoPagoResolveInput = z.input<typeof resolveSchema>

/** Respuesta del simulador: adónde vuelve el cliente. */
export interface MockMercadoPagoResolveResult {
  /** Dirección de regreso, `/checkout/resultado?pedido=GLP-…` (sin el token del pedido). */
  returnUrl: string
}

/**
 * Rutas internas del modo de prueba, fuera del contrato: el simulador de Mercado Pago, que aplica
 * el resultado elegido al intento de pago (la preferencia o el desafío 3-D Secure de una tarjeta)
 * y devuelve la dirección de regreso. Hace de Mercado Pago y de su aviso al back a la vez.
 */
export const INTERNAL_ROUTES: readonly MockRoute[] = [
  {
    method: 'POST',
    path: MOCK_MERCADOPAGO_RESOLVE_PATH,
    handler: async (ctx) => {
      const input = parseOrFail(resolveSchema, await ctx.body())
      expireOrders(ctx.db, ctx.now)
      const order = ctx.db.orders.find((candidate) => candidate.number === input.number)
      if (order === undefined) throw orderNotFound()
      const intent =
        input.intent === null
          ? activeIntent(order)
          : order.intents.find((candidate) => candidate.id === input.intent)
      if (intent === undefined) {
        throw new ResponseError(
          problem(404, 'No encontrado', { detail: 'No existe ese intento de pago.' }),
        )
      }
      if (order.status !== 'pending_payment' || intent !== activeIntent(order)) {
        throw new ResponseError(
          problem(409, 'El intento ya no está activo', {
            type: 'intent_not_active',
            detail: 'El pago se canceló, venció o ya se resolvió.',
          }),
        )
      }
      const challenge = intent.status === 'action_required'
      intent.mpPaymentId ??= mockPaymentId()
      switch (input.result) {
        case 'approved':
          intent.status = 'approved'
          intent.statusDetail = 'accredited'
          markPaid(ctx, order)
          break
        case 'pending':
          intent.status = 'pending'
          intent.statusDetail = challenge ? 'pending_challenge' : 'pending_waiting_payment'
          break
        case 'rejected':
          intent.status = 'rejected'
          intent.statusDetail = challenge ? 'cc_rejected_3ds_challenge' : 'cc_rejected_other_reason'
          break
      }
      const result: MockMercadoPagoResolveResult = {
        returnUrl: `/checkout/resultado?pedido=${encodeURIComponent(order.number)}`,
      }
      return json(result)
    },
  },
]
