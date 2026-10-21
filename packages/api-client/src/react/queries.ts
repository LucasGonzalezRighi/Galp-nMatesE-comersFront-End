import { queryOptions } from '@tanstack/react-query'
import type { ApiClient } from '../client'
import type { AdminProductQuery } from '../services'
import { isApiError } from '../errors'
import {
  getAdminCsrfToken,
  getAdminSession,
  getPublicSettings,
  listAdminProducts,
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
