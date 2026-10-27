import type { ApiClient } from '../client'
import type {
  AdminOrderPage,
  DashboardSummary,
  Order,
  OrderStatusChange,
  operations,
} from '../generated/schema'
import { unwrap } from '../unwrap'
import { assertOrderNumber } from './validation'

/**
 * Parámetros de búsqueda de `GET /admin/orders`: estados (se repiten, `status: ['paid',
 * 'preparing']` son los pedidos para despachar), estado del pago, texto y página.
 */
export type AdminOrderQuery = NonNullable<operations['listAdminOrders']['parameters']['query']>

/**
 * Trae las cifras del inicio del dashboard: ventas de hoy y de los últimos 7 días, pedidos para
 * despachar, productos con poco stock, reseñas y mensajes pendientes y alertas de pago.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function getDashboardSummary(api: ApiClient): Promise<DashboardSummary> {
  return unwrap(api.GET('/admin/dashboard/summary'))
}

/**
 * Lista una página de pedidos del dashboard, del más nuevo al más viejo, de a 20.
 *
 * @param api - Cliente de la API.
 * @param query - Filtros (se combinan) y página; sin ellos, la primera página de todos.
 * @throws {ApiError} Con `validation` si un filtro no sirve y `unauthorized` si no hay sesión.
 */
export function listAdminOrders(api: ApiClient, query?: AdminOrderQuery): Promise<AdminOrderPage> {
  return unwrap(api.GET('/admin/orders', { params: { query } }))
}

/**
 * Trae un pedido completo, con su historial y los datos del pago.
 *
 * @param api - Cliente de la API.
 * @param number - Número del pedido (`GLP-` y cinco dígitos).
 * @throws {RangeError} Si el número no tiene el formato del contrato.
 * @throws {ApiError} Con `not_found` si no existe y `unauthorized` si no hay sesión.
 */
export function getAdminOrder(api: ApiClient, number: string): Promise<Order> {
  assertOrderNumber(number)
  return unwrap(api.GET('/admin/orders/{number}', { params: { path: { number } } }))
}

/**
 * Cambia el estado de un pedido a uno de los destinos de `adminOrderTargets` de `@galpon/domain`.
 * Al despachar guarda el seguimiento; al cancelar libera la reserva de stock.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param number - Número del pedido.
 * @param input - Estado nuevo, empresa y seguimiento (solo con `shipped`) y nota del historial.
 * @throws {RangeError} Si el número no tiene el formato del contrato.
 * @throws {ApiError} Con `conflict` `invalid_status_transition` si el pedido no puede pasar a ese
 *   estado (por ejemplo, otra pestaña ya lo despachó) o `payment_in_progress` si hay un pago en
 *   curso; `validation` si falta el seguimiento al despachar; `not_found`, `unauthorized` y
 *   `forbidden` (`csrf_invalid`) como cualquier escritura.
 */
export function changeOrderStatus(
  api: ApiClient,
  number: string,
  input: OrderStatusChange,
): Promise<Order> {
  assertOrderNumber(number)
  return unwrap(
    api.POST('/admin/orders/{number}/status', { params: { path: { number } }, body: input }),
  )
}
