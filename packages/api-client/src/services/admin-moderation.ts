import type { ApiClient } from '../client'
import type {
  AdminReview,
  AdminReviewPage,
  AdminReviewUpdate,
  ContactMessage,
  ContactMessagePage,
  ContactMessageUpdate,
  operations,
} from '../generated/schema'
import { unwrap } from '../unwrap'
import { assertResourceId } from './validation'

/** Parámetros de búsqueda de `GET /admin/reviews`: estado y página. */
export type AdminReviewQuery = NonNullable<operations['listAdminReviews']['parameters']['query']>

/** Parámetros de búsqueda de `GET /admin/messages`: tipo, leído o no leído y página. */
export type AdminMessageQuery = NonNullable<operations['listAdminMessages']['parameters']['query']>

/**
 * Lista una página de reseñas en cualquier estado, de la más nueva a la más vieja, de a 20, con
 * el producto de cada una.
 *
 * @param api - Cliente de la API.
 * @param query - Estado y página; sin ellos, la primera página de todas.
 * @throws {ApiError} Con `validation` si el filtro no sirve y `unauthorized` si no hay sesión.
 */
export function listAdminReviews(
  api: ApiClient,
  query?: AdminReviewQuery,
): Promise<AdminReviewPage> {
  return unwrap(api.GET('/admin/reviews', { params: { query } }))
}

/**
 * Modera una reseña: la aprueba, la oculta o la deja pendiente, o cambia si es destacada. Solo se
 * cambia lo que viene.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador de la reseña.
 * @param input - Estado, destacada o las dos cosas (al menos una).
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Con `validation` si no viene ningún cambio, `not_found` si no existe,
 *   `unauthorized` y `forbidden` (`csrf_invalid`).
 */
export function updateAdminReview(
  api: ApiClient,
  id: string,
  input: AdminReviewUpdate,
): Promise<AdminReview> {
  assertResourceId(id, 'de la reseña')
  return unwrap(api.PATCH('/admin/reviews/{id}', { params: { path: { id } }, body: input }))
}

/**
 * Lista una página de la bandeja (contacto y arrepentimientos), del más nuevo al más viejo, de a 20.
 *
 * @param api - Cliente de la API.
 * @param query - Tipo, leído (`true` o `false`) y página; los filtros se combinan.
 * @throws {ApiError} Con `validation` si un filtro no sirve y `unauthorized` si no hay sesión.
 */
export function listAdminMessages(
  api: ApiClient,
  query?: AdminMessageQuery,
): Promise<ContactMessagePage> {
  return unwrap(api.GET('/admin/messages', { params: { query } }))
}

/**
 * Marca un mensaje como leído o no leído.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador del mensaje (`msg-0001`).
 * @param input - Si queda leído.
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Con `validation` si `read` no es booleano, `not_found` si no existe,
 *   `unauthorized` y `forbidden` (`csrf_invalid`).
 */
export function updateAdminMessage(
  api: ApiClient,
  id: string,
  input: ContactMessageUpdate,
): Promise<ContactMessage> {
  assertResourceId(id, 'del mensaje')
  return unwrap(api.PATCH('/admin/messages/{id}', { params: { path: { id } }, body: input }))
}
