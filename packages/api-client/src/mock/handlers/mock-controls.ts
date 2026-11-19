import { z } from 'zod'
import type { Leather } from '@galpon/domain'
import { LEATHERS, normalizeLeathers } from '@galpon/domain'
import { settingsFormSchema } from '@galpon/schemas'
import type { MockRoute } from '../router'
import { json, notFound, problem, ResponseError } from '../http'
import { toPublicSettings } from '../mappers'
import { orderNumberParam, parseOrFail } from '../validation'
import { MOCK_MEDIA_ROUTE } from './admin-media'
import { expireOrders, orderNotFound } from './order-state'

/**
 * Ruta interna que vence la reserva de un pedido ahora mismo (`{number}` es `GLP-12345`), relativa
 * al prefijo de la API (`/api/v1`). No está en el contrato: solo existe en el modo de prueba y
 * sirve para probar el vencimiento de 30 minutos sin esperar ni tocar el reloj del servidor.
 */
export const MOCK_EXPIRE_ORDER_PATH = '/__mock/orders/{number}/expire'

/**
 * Ruta interna que cambia el precio, el stock o los cueros de un producto (`{id}` es el
 * identificador, por ejemplo `prd-imperial-premium`), relativa al prefijo de la API. No está en el
 * contrato: solo existe en el modo de prueba y sirve para probar `409 price_changed`,
 * `total_changed`, `stock_changed` y la conciliación del cuero del carrito desde un navegador, que
 * solo llega a la base por HTTP.
 */
export const MOCK_PRODUCT_PATH = '/__mock/products/{id}'

/**
 * Cuerpo de {@link MOCK_PRODUCT_PATH}: al menos uno de los tres campos, y ninguno más. Los cueros
 * se guardan sin repetir y en el orden de `LEATHERS`.
 */
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
    leathers: z
      .array(z.enum(LEATHERS, { error: 'Elegí un color de la lista.' }))
      .transform(normalizeLeathers)
      .optional(),
  })
  .refine(
    (change) =>
      change.priceArs !== undefined || change.stock !== undefined || change.leathers !== undefined,
    { message: 'Mandá el precio, el stock o los cueros.' },
  )

/**
 * Ruta interna que reemplaza los datos del vendedor o los enlaces a Defensa del Consumidor de los
 * ajustes, relativa al prefijo de la API. No está en el contrato: solo existe en el modo de prueba
 * y sirve para probar las páginas legales y el pie con los datos cargados desde un navegador.
 */
export const MOCK_SETTINGS_PATH = '/__mock/settings'

/**
 * Cuerpo de {@link MOCK_SETTINGS_PATH}: `seller`, `consumerLinks` o los dos, y nada más. Cada uno
 * reemplaza entero al de la base y se valida con las reglas de `settingsFormSchema`.
 */
const settingsChangeSchema = z
  .strictObject({
    seller: settingsFormSchema.shape.seller.optional(),
    consumerLinks: settingsFormSchema.shape.consumerLinks.optional(),
  })
  .refine((change) => change.seller !== undefined || change.consumerLinks !== undefined, {
    message: 'Mandá los datos del vendedor o los enlaces de Defensa del Consumidor.',
  })

/** Cambio de los datos del vendedor o de los enlaces de Defensa del Consumidor. */
export type MockSettingsChangeInput = z.input<typeof settingsChangeSchema>

/** Cambio de precio, de stock o de cueros que se le pide a un producto. */
export type MockProductChangeInput = z.input<typeof productChangeSchema>

/** Respuesta de {@link MOCK_PRODUCT_PATH}: cómo quedó el producto. */
export interface MockProductChangeResult {
  /** Identificador del producto. */
  id: string
  /** Precio en pesos enteros, o `null` si el producto se consulta por mail. */
  priceArs: number | null
  /** Unidades en stock. */
  stock: number
  /** Cueros que ofrece, en el orden de `LEATHERS`. */
  leathers: Leather[]
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
 * Controles de escenarios: rutas internas del modo de prueba, fuera del contrato y sin sesión, que
 * cambian la base para armar un escenario (pedido vencido, precio, stock o cueros que cambian, datos
 * del vendedor). Las usan los tests de extremo a extremo, que solo llegan a la base del servidor por
 * HTTP. Quién puede usarlas lo decide `allowControl` de `createMockFetch` (la tienda las cierra en
 * producción).
 *
 * - `POST /__mock/orders/{number}/expire`: vence la reserva del pedido pendiente, libera su stock
 *   y cancela su intento de pago activo; `409` si el pedido ya no está pendiente de pago.
 * - `POST /__mock/products/{id}` con `{ priceArs?, stock?, leathers? }`: cambia el precio, el
 *   stock o los cueros del producto y avisa que cambió el catálogo.
 * - `POST /__mock/settings` con `{ seller?, consumerLinks? }`: reemplaza los datos del vendedor
 *   o los enlaces a Defensa del Consumidor, avisa que cambiaron los ajustes (`settings`) y
 *   responde los ajustes públicos.
 */
export const SCENARIO_CONTROL_ROUTES: readonly MockRoute[] = [
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
      if (change.leathers !== undefined) product.leathers = change.leathers
      ctx.invalidate(['products'])
      const result: MockProductChangeResult = {
        id: product.id,
        priceArs: product.priceArs,
        stock: product.stock,
        leathers: [...product.leathers],
      }
      return json(result)
    },
  },
  {
    method: 'POST',
    path: MOCK_SETTINGS_PATH,
    handler: async (ctx) => {
      const change = parseOrFail(settingsChangeSchema, await ctx.body())
      if (change.seller !== undefined) ctx.db.settings.seller = change.seller
      if (change.consumerLinks !== undefined) ctx.db.settings.consumerLinks = change.consumerLinks
      ctx.invalidate(['settings'])
      return json(toPublicSettings(ctx.db.settings))
    },
  },
]

/**
 * Rutas internas del modo de prueba, fuera del contrato: los controles de escenarios
 * ({@link SCENARIO_CONTROL_ROUTES}) y `POST /__mock/media` con `{ folder, dataUrl, width, height }`,
 * que registra una foto reducida del dashboard en lugar de subirla a Cloudinary (ver
 * `MOCK_MEDIA_ROUTE`; pide la sesión del admin).
 */
export const MOCK_CONTROL_ROUTES: readonly MockRoute[] = [
  ...SCENARIO_CONTROL_ROUTES,
  MOCK_MEDIA_ROUTE,
]
