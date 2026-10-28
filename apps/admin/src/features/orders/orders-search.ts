import { z } from 'zod'
import type { AdminOrderQuery } from '@galpon/api-client'
import { ORDER_STATUSES, ORDERS_TO_SHIP_STATUSES, PAYMENT_STATUSES } from '@galpon/domain'
import { ORDERS_SEARCH_MAX_LENGTH } from './orders.constants'

/** Valor de `?estado=` que junta los pedidos pagados y en preparación ("Para despachar"). */
export const ORDERS_TO_SHIP_FILTER = 'para-despachar'

/** Valores de `?estado=`: "Para despachar" y cada estado del pedido. */
export const ORDER_STATUS_FILTERS = [ORDERS_TO_SHIP_FILTER, ...ORDER_STATUSES] as const

/**
 * Parámetros de `/pedidos` en la URL: `?estado=`, `?pago=` y `?pagina=`. Lo que no sirve se
 * descarta (`.catch`) en lugar de romper la pantalla. La búsqueda por texto **no** va acá: tiene
 * emails y nombres (§16) y vive en `useOrdersSearchStore`.
 */
export const ordersSearchSchema = z.object({
  estado: z.enum(ORDER_STATUS_FILTERS).optional().catch(undefined),
  pago: z.enum(PAYMENT_STATUSES).optional().catch(undefined),
  pagina: z.number().int().min(1).optional().catch(undefined),
})

/** Filtros de `/pedidos` ya validados. */
export type OrdersSearch = z.output<typeof ordersSearchSchema>

/**
 * Arma la consulta de `GET /admin/orders` a partir de los filtros de la URL y el texto buscado.
 *
 * `para-despachar` pide los dos estados de `ORDERS_TO_SHIP_STATUSES`; la página 1 y el texto
 * vacío no se mandan.
 *
 * @param search - Filtros de la URL.
 * @param text - Texto de la búsqueda (número, email o nombre); se recorta.
 * @returns La consulta, lista para `adminOrdersQuery`.
 * @throws {RangeError} Si la página no es un entero mayor a 0 o el texto pasa de 100 caracteres.
 * @example
 * toAdminOrderQuery({ estado: 'para-despachar' }, '') // { status: ['paid', 'preparing'] }
 */
export function toAdminOrderQuery(search: OrdersSearch, text: string): AdminOrderQuery {
  const { estado, pago, pagina } = search
  if (pagina !== undefined && (!Number.isInteger(pagina) || pagina < 1)) {
    throw new RangeError(
      `La página tiene que ser un entero mayor a 0; se recibió ${String(pagina)}.`,
    )
  }
  const q = text.trim()
  if (q.length > ORDERS_SEARCH_MAX_LENGTH) {
    throw new RangeError(
      `La búsqueda admite hasta ${String(ORDERS_SEARCH_MAX_LENGTH)} caracteres; se recibieron ${String(q.length)}.`,
    )
  }
  const query: AdminOrderQuery = {}
  if (estado === ORDERS_TO_SHIP_FILTER) query.status = [...ORDERS_TO_SHIP_STATUSES]
  else if (estado !== undefined) query.status = [estado]
  if (pago !== undefined) query.paymentStatus = pago
  if (pagina !== undefined && pagina > 1) query.page = pagina
  if (q !== '') query.q = q
  return query
}

/**
 * Indica si la lista está filtrada (estado, pago o texto); la página no cuenta.
 *
 * @param search - Filtros de la URL.
 * @param text - Texto de la búsqueda.
 * @returns `true` si algún filtro está puesto.
 */
export function hasOrderFilters(search: OrdersSearch, text: string): boolean {
  return search.estado !== undefined || search.pago !== undefined || text.trim() !== ''
}
