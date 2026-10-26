import { z } from 'zod'
import { SHIPPING_METHODS } from '@galpon/domain'
import { postalCodeSchema } from '@galpon/schemas'
import type { MockRoute } from '../router'
import { json, ResponseError, validationProblem } from '../http'
import { route } from '../router'
import { parseOrFail, withoutNulls } from '../validation'
import { expireOrders } from './order-state'
import { cartItemsSchema, priceCart } from './pricing'

/** Cuerpo de `POST /cart/quote`. */
const cartQuoteSchema = z.object({ items: cartItemsSchema })

/** Cuerpo de `POST /shipping/quote`; el código postal falta (era `null`) en el retiro. */
const shippingQuoteSchema = z
  .object({
    method: z.enum(SHIPPING_METHODS),
    postalCode: postalCodeSchema.optional(),
    items: cartItemsSchema,
  })
  .refine((input) => input.method === 'pickup' || input.postalCode !== undefined, {
    error: 'Ingresá el código postal.',
    path: ['postalCode'],
  })

/** Rutas del carrito: cotizar las líneas y el envío. */
export const cartRoutes: readonly MockRoute[] = [
  route('POST', '/cart/quote', async (ctx) => {
    const { items } = parseOrFail(cartQuoteSchema, withoutNulls(await ctx.body()))
    expireOrders(ctx.db, ctx.now)
    return json(priceCart(ctx.db, items, ctx.now).quote)
  }),

  route('POST', '/shipping/quote', async (ctx) => {
    const { method } = parseOrFail(shippingQuoteSchema, withoutNulls(await ctx.body()))
    const option = ctx.db.settings.shippingOptions.find((candidate) => candidate.method === method)
    if (option?.enabled !== true) {
      throw new ResponseError(
        validationProblem([
          {
            field: 'method',
            code: 'unavailable',
            message: 'Ese método de envío no está disponible.',
          },
        ]),
      )
    }
    return json({ method, costArs: option.costArs, eta: option.eta })
  }),
]
