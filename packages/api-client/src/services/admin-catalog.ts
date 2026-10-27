import type { MediaPurpose } from '@galpon/domain'
import { MEDIA_PURPOSES } from '@galpon/domain'
import type { ApiClient } from '../client'
import type { Category, CategoryInput, MediaSignature } from '../generated/schema'
import { unwrap, unwrapVoid } from '../unwrap'
import { assertResourceId } from './validation'

/**
 * Lista las líneas de productos del dashboard, por posición.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Con `unauthorized` si no hay sesión.
 */
export function listAdminCategories(api: ApiClient): Promise<Category[]> {
  return unwrap(api.GET('/admin/categories'))
}

/**
 * Crea una línea al final del listado.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Datos del formulario, con la foto ya subida o `null`.
 * @throws {ApiError} Con `validation` si un campo no sirve o la foto no existe
 *   (`image.publicId`); `conflict` (`slug_taken`) si otra línea usa el slug; `unauthorized` sin
 *   sesión y `forbidden` (`csrf_invalid`) sin el token CSRF de la sesión.
 */
export function createAdminCategory(api: ApiClient, input: CategoryInput): Promise<Category> {
  return unwrap(api.POST('/admin/categories', { body: input }))
}

/**
 * Guarda los cambios de una línea.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador de la línea (`cat-…`).
 * @param input - Datos del formulario.
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Con `not_found` si no existe; `validation`, `conflict` (`slug_taken`),
 *   `unauthorized` y `forbidden` (`csrf_invalid`) como {@link createAdminCategory}.
 */
export function updateAdminCategory(
  api: ApiClient,
  id: string,
  input: CategoryInput,
): Promise<Category> {
  assertResourceId(id, 'de la línea')
  return unwrap(api.PATCH('/admin/categories/{id}', { params: { path: { id } }, body: input }))
}

/**
 * Borra una línea sin productos; las demás se renumeran.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador de la línea.
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Con `conflict` (`category_has_products`) si tiene productos de cualquier
 *   estado, también archivados; `not_found` si no existe; `unauthorized` sin sesión y `forbidden`
 *   (`csrf_invalid`) sin el token CSRF de la sesión.
 */
export function deleteAdminCategory(api: ApiClient, id: string): Promise<void> {
  assertResourceId(id, 'de la línea')
  return unwrapVoid(api.DELETE('/admin/categories/{id}', { params: { path: { id } } }))
}

/**
 * Guarda el orden de las líneas.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param ids - Identificadores de todas las líneas, una vez cada una, en el orden nuevo.
 * @throws {RangeError} Si la lista está vacía o algún identificador no sirve.
 * @throws {ApiError} Con `validation` en `ids` si no son exactamente todas las líneas, una vez
 *   cada una; `unauthorized` sin sesión y `forbidden` (`csrf_invalid`) sin el token CSRF.
 */
export function reorderAdminCategories(api: ApiClient, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) throw new RangeError('El orden necesita al menos una línea')
  for (const id of ids) assertResourceId(id, 'de la línea')
  return unwrapVoid(api.PUT('/admin/categories/order', { body: { ids: [...ids] } }))
}

/**
 * Pide la firma para subir una foto a Cloudinary en la carpeta de su uso.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param purpose - Para qué es la foto: `product`, `category`, `partner` o `site`.
 * @throws {RangeError} Si el uso no es uno de `MEDIA_PURPOSES`.
 * @throws {ApiError} Con `unauthorized` sin sesión y `forbidden` (`csrf_invalid`) sin el token
 *   CSRF de la sesión.
 */
export function createMediaSignature(
  api: ApiClient,
  purpose: MediaPurpose,
): Promise<MediaSignature> {
  if (!(MEDIA_PURPOSES as readonly string[]).includes(purpose)) {
    throw new RangeError(`El uso de la foto tiene que ser ${MEDIA_PURPOSES.join(', ')}`)
  }
  return unwrap(api.POST('/admin/media/signature', { body: { purpose } }))
}
