import { z } from 'zod'
import type { MockRoute } from '../router'
import { json, notFound, problem, ResponseError } from '../http'
import { orderNumberParam, parseOrFail } from '../validation'
import { expireOrders, orderNotFound } from './order-state'

/**
 * Ruta interna que vence la reserva de un pedido ahora mismo (`{number}` es `GLP-12345`), relativa
 * al prefijo de la API (`/api/v1`). No está en el contrato: solo existe en el modo de prueba y
 * sirve para probar el vencimiento de 30 minutos sin esperar ni tocar el reloj del servidor.
 */
export const MOCK_EXPIRE_ORDER_PATH = '/__mock/orders/{number}/expire'

/**
 * Ruta interna que cambia el precio o el stock de un producto (`{id}` es el identificador, por
 * ejemplo `prd-imperial-premium`), relativa al prefijo de la API. No está en el contrato: solo
 * existe en el modo de prueba y sirve para probar `409 price_changed`, `total_changed` y
 * `stock_changed` desde un navegador, que solo llega a la base por HTTP.
 */
export const MOCK_PRODUCT_PATH = '/__mock/products/{id}'

/** Cuerpo de {@link MOCK_PRODUCT_PATH}: al menos uno de los dos campos, y ninguno más. */
const productChangeSchema = z
  .strictObject({
    priceArs: z
      .int({ error: 'El precio tiene que ser un número entero de pesos.' })
      .min(0, 'El precio no puede ser negativo.')
      .optional(),
    stock: z
      .int({ error: 'El stock tiene que ser un número entero.' })
      .min(0, 'El stock no puede ser negativo.')
      .optional(),
  })
  .refine((change) => change.priceArs !== undefined || change.stock !== undefined, {
    message: 'Mandá el precio, el stock o los dos.',
  })

/** Cambio de precio o de stock que se le pide a un producto. */
export type MockProductChangeInput = z.input<typeof productChangeSchema>

/** Respuesta de {@link MOCK_PRODUCT_PATH}: cómo quedó el producto. */
export interface MockProductChangeResult {
  /** Identificador del producto. */
  id: string
  /** Precio en pesos enteros, o `null` si el producto se consulta por mail. */
  priceArs: number | null
  /** Unidades en stock. */
  stock: number
}

/** Respuesta de {@link MOCK_EXPIRE_ORDER_PATH}: cómo quedó el pedido. */
export interface MockExpireOrderResult {
  /** Número del pedido. */
  number: string
  /** Estado del pedido después de vencer, siempre `expired`. */
  status: 'expired'
  /** Vencimiento de la reserva, que pasa a ser el momento del pedido. */
  reservedUntil: string
}

/**
 * Rutas internas del modo de prueba para armar escenarios (pedido vencido, precio o stock que
 * cambian), fuera del contrato. Las usan los tests de extremo a extremo, que solo llegan a la base
 * del servidor por HTTP.
 *
 * - `POST /__mock/orders/{number}/expire`: vence la reserva del pedido pendiente, libera su stock
 *   y cancela su intento de pago activo; `409` si el pedido ya no está pendiente de pago.
 * - `POST /__mock/products/{id}` con `{ priceArs?, stock? }`: cambia el precio o el stock del
 *   producto y avisa que cambió el catálogo.
 */
export const MOCK_CONTROL_ROUTES: readonly MockRoute[] = [
  {
    method: 'POST',
    path: MOCK_EXPIRE_ORDER_PATH,
    handler: (ctx) => {
      const number = orderNumberParam(ctx.params)
      const order = ctx.db.orders.find((candidate) => candidate.number === number)
      if (order === undefined) throw orderNotFound()
      if (order.status !== 'pending_payment') {
        throw new ResponseError(
          problem(409, 'El pedido no está pendiente de pago', {
            type: 'order_not_pending',
            detail: 'Solo se puede vencer un pedido que espera el pago.',
          }),
        )
      }
      order.reservedUntil = ctx.now.toISOString()
      expireOrders(ctx.db, ctx.now)
      const result: MockExpireOrderResult = {
        number: order.number,
        status: 'expired',
        reservedUntil: order.reservedUntil,
      }
      return json(result)
    },
  },
  {
    method: 'POST',
    path: MOCK_PRODUCT_PATH,
    handler: async (ctx) => {
      const id = ctx.params.id ?? ''
      const change = parseOrFail(productChangeSchema, await ctx.body())
      const product = ctx.db.products.find((candidate) => candidate.id === id)
      if (product === undefined) {
        throw new ResponseError(notFound('No existe ese producto.'))
      }
      if (change.priceArs !== undefined) product.priceArs = change.priceArs
      if (change.stock !== undefined) product.stock = change.stock
      ctx.invalidate(['products'])
      const result: MockProductChangeResult = {
        id: product.id,
        priceArs: product.priceArs,
        stock: product.stock,
      }
      return json(result)
    },
  },
]
