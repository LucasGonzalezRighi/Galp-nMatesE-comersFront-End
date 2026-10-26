import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from '../client'
import type { CartQuoteInput, InstallmentsInput } from '../generated/schema'
import type { AdminProductQuery } from '../services'
import { isApiError } from '../errors'
import {
  getAdminCsrfToken,
  getAdminSession,
  getCustomerCsrfToken,
  getInstallments,
  getMe,
  getMyOrder,
  getOrder,
  getPublicSettings,
  listAdminProducts,
  listMyAddresses,
  listMyOrders,
  quoteCart,
} from '../services'
import { queryKeys } from './query-keys'

/** Cuántas veces se reintenta una consulta que falló por la red o por el servidor. */
const MAX_RETRIES = 2

/**
 * Política de reintentos de las consultas: reintenta hasta dos veces solo los errores de red y de
 * servidor. Una respuesta definitiva (401, 404, 422, 429…) o un error que no viene de la API no se
 * reintenta, así el admin no espera varios segundos para enterarse de que no tiene sesión.
 *
 * @param failureCount - Cuántas veces falló ya la consulta.
 * @param error - El error de la última falla.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.kind === 'network' || error.kind === 'server') &&
    failureCount < MAX_RETRIES
  )
}

/**
 * Consulta de los ajustes públicos de la tienda.
 *
 * @param api - Cliente de la API.
 */
export function publicSettingsQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.publicSettings(),
    queryFn: () => getPublicSettings(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de la sesión del dashboard; falla con `ApiError` `unauthorized` si no hay sesión.
 *
 * @param api - Cliente de la API.
 */
export function adminSessionQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.adminSession(),
    queryFn: () => getAdminSession(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta del token anti-CSRF de la sesión actual.
 *
 * @param api - Cliente de la API.
 */
export function adminCsrfQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.adminCsrf(),
    queryFn: () => getAdminCsrfToken(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de una página del listado de productos del dashboard.
 *
 * @param api - Cliente de la API.
 * @param query - Filtros, orden y página.
 */
export function adminProductsQuery(api: ApiClient, query: AdminProductQuery) {
  return queryOptions({
    queryKey: queryKeys.adminProducts(query),
    queryFn: () => listAdminProducts(api, query),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de la cotización de un carrito (importes, ahorro por kit y problemas por línea).
 *
 * @param api - Cliente de la API.
 * @param input - Líneas del carrito.
 */
export function cartQuoteQuery(api: ApiClient, input: CartQuoteInput) {
  return queryOptions({
    queryKey: queryKeys.cartQuote(input),
    queryFn: () => quoteCart(api, input),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de un pedido, con el token del cliente (`getOrderToken`) o la sesión del dueño.
 *
 * @param api - Cliente de la API.
 * @param number - Número del pedido.
 */
export function orderQuery(api: ApiClient, number: string) {
  return queryOptions({
    queryKey: queryKeys.order(number),
    queryFn: () => getOrder(api, number),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de las cuotas de una tarjeta, calculadas por el back sobre el total del pedido.
 *
 * @param api - Cliente de la API.
 * @param number - Número del pedido.
 * @param input - Primeros dígitos de la tarjeta y su tipo.
 */
export function installmentsQuery(api: ApiClient, number: string, input: InstallmentsInput) {
  return queryOptions({
    queryKey: queryKeys.installments(number, input),
    queryFn: () => getInstallments(api, number, input),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta del token anti-CSRF de la tienda (abre una sesión anónima si no hay).
 *
 * @param api - Cliente de la API.
 */
export function customerCsrfQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.customerCsrf(),
    queryFn: () => getCustomerCsrfToken(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de los datos del cliente; falla con `ApiError` `unauthorized` si no hay sesión.
 *
 * @param api - Cliente de la API.
 */
export function meQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.me(),
    queryFn: () => getMe(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de una página de "Mis pedidos".
 *
 * @param api - Cliente de la API.
 * @param page - Número de página, empezando en 1.
 */
export function myOrdersQuery(api: ApiClient, page = 1) {
  return queryOptions({
    queryKey: queryKeys.myOrders(page),
    queryFn: () => listMyOrders(api, page),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de uno de los pedidos del cliente.
 *
 * @param api - Cliente de la API.
 * @param number - Número del pedido.
 */
export function myOrderQuery(api: ApiClient, number: string) {
  return queryOptions({
    queryKey: queryKeys.myOrder(number),
    queryFn: () => getMyOrder(api, number),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de la libreta de direcciones del cliente.
 *
 * @param api - Cliente de la API.
 */
export function myAddressesQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.myAddresses(),
    queryFn: () => listMyAddresses(api),
    retry: shouldRetryQuery,
  })
}
