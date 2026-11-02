import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from '../client'
import type { CartQuoteInput, InstallmentsInput } from '../generated/schema'
import type {
  AdminContentByPage,
  AdminContentPage,
  AdminMessageQuery,
  AdminOrderQuery,
  AdminProductQuery,
  AdminReviewQuery,
  LegalDocument,
} from '../services'
import { isApiError } from '../errors'
import {
  ADMIN_CONTENT_PAGES,
  getAdminAboutContent,
  getAdminCsrfToken,
  getAdminFaqContent,
  getAdminFooterContent,
  getAdminHomeContent,
  getAdminLegalContent,
  getAdminOrder,
  getAdminProduct,
  getAdminProductTabsContent,
  getAdminSession,
  getAdminSettings,
  getDashboardSummary,
  getCustomerCsrfToken,
  getInstallments,
  getMe,
  getMyOrder,
  getOrder,
  getPublicSettings,
  listAdminCategories,
  listAdminMessages,
  listAdminOrders,
  listAdminProducts,
  listAdminReviews,
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
 * Consulta del resumen del inicio del dashboard (cifras, poco stock y alertas de pago).
 *
 * @param api - Cliente de la API.
 */
export function adminDashboardQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.adminDashboard(),
    queryFn: () => getDashboardSummary(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de un producto del dashboard, en cualquier estado.
 *
 * @param api - Cliente de la API.
 * @param id - Identificador del producto (`prd-…`).
 */
export function adminProductQuery(api: ApiClient, id: string) {
  return queryOptions({
    queryKey: queryKeys.adminProduct(id),
    queryFn: () => getAdminProduct(api, id),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de las líneas de producto del dashboard, con la cantidad de productos de cada una.
 *
 * @param api - Cliente de la API.
 */
export function adminCategoriesQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.adminCategories(),
    queryFn: () => listAdminCategories(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de una página del listado de pedidos del dashboard.
 *
 * @param api - Cliente de la API.
 * @param query - Estados, estado del pago, texto y página.
 */
export function adminOrdersQuery(api: ApiClient, query: AdminOrderQuery) {
  return queryOptions({
    queryKey: queryKeys.adminOrders(query),
    queryFn: () => listAdminOrders(api, query),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de un pedido del dashboard.
 *
 * @param api - Cliente de la API.
 * @param number - Número del pedido.
 */
export function adminOrderQuery(api: ApiClient, number: string) {
  return queryOptions({
    queryKey: queryKeys.adminOrder(number),
    queryFn: () => getAdminOrder(api, number),
    retry: shouldRetryQuery,
  })
}

/** Servicio que trae cada página de contenido. */
const ADMIN_CONTENT_FETCHERS: {
  [P in AdminContentPage]: (api: ApiClient) => Promise<AdminContentByPage[P]>
} = {
  home: getAdminHomeContent,
  about: getAdminAboutContent,
  faq: getAdminFaqContent,
  footer: getAdminFooterContent,
  'product-tabs': getAdminProductTabsContent,
}

/**
 * Consulta de una página de contenido del dashboard; los datos tienen el tipo de esa página.
 *
 * @param api - Cliente de la API.
 * @param page - `home`, `about`, `faq`, `footer` o `product-tabs`.
 * @throws {RangeError} Si la página no es ninguna de esas.
 */
export function adminContentQuery<P extends AdminContentPage>(api: ApiClient, page: P) {
  if (!(ADMIN_CONTENT_PAGES as readonly string[]).includes(page)) {
    throw new RangeError(
      `La página de contenido tiene que ser ${ADMIN_CONTENT_PAGES.join(', ')}, y recibió ${JSON.stringify(page)}`,
    )
  }
  const fetchPage: (api: ApiClient) => Promise<AdminContentByPage[P]> = ADMIN_CONTENT_FETCHERS[page]
  return queryOptions({
    queryKey: queryKeys.adminContent(page),
    queryFn: () => fetchPage(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de un documento legal para editarlo.
 *
 * @param api - Cliente de la API.
 * @param document - `terms` o `privacy`.
 */
export function adminLegalContentQuery(api: ApiClient, document: LegalDocument) {
  return queryOptions({
    queryKey: queryKeys.adminLegalContent(document),
    queryFn: () => getAdminLegalContent(api, document),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de los ajustes del dashboard.
 *
 * @param api - Cliente de la API.
 */
export function adminSettingsQuery(api: ApiClient) {
  return queryOptions({
    queryKey: queryKeys.adminSettings(),
    queryFn: () => getAdminSettings(api),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de una página de reseñas del dashboard.
 *
 * @param api - Cliente de la API.
 * @param query - Estado y página.
 */
export function adminReviewsQuery(api: ApiClient, query: AdminReviewQuery) {
  return queryOptions({
    queryKey: queryKeys.adminReviews(query),
    queryFn: () => listAdminReviews(api, query),
    retry: shouldRetryQuery,
  })
}

/**
 * Consulta de una página de la bandeja de mensajes.
 *
 * @param api - Cliente de la API.
 * @param query - Tipo, leído y página.
 */
export function adminMessagesQuery(api: ApiClient, query: AdminMessageQuery) {
  return queryOptions({
    queryKey: queryKeys.adminMessages(query),
    queryFn: () => listAdminMessages(api, query),
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
