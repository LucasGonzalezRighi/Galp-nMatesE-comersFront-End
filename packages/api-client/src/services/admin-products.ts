import type { ApiClient } from '../client'
import type {
  AdminProduct,
  AdminProductInput,
  AdminProductPage,
  operations,
} from '../generated/schema'
import { unwrap } from '../unwrap'
import { assertResourceId } from './validation'

/** Parámetros de búsqueda de `GET /admin/products`: línea, texto, estado, stock, orden y página. */
export type AdminProductQuery = NonNullable<operations['listAdminProducts']['parameters']['query']>

/**
 * Lista una página de productos del dashboard, en cualquier estado.
 *
 * @param api - Cliente de la API.
 * @param query - Filtros, orden y página; sin ellos, la primera página ordenada por código.
 * @throws {ApiError} Si la llamada falla (`unauthorized` si no hay sesión).
 */
export function listAdminProducts(
  api: ApiClient,
  query?: AdminProductQuery,
): Promise<AdminProductPage> {
  return unwrap(api.GET('/admin/products', { params: { query } }))
}

/**
 * Trae un producto del dashboard, en cualquier estado.
 *
 * @param api - Cliente de la API.
 * @param id - Identificador del producto (`prd-…`).
 * @throws {RangeError} Si el identificador está vacío o tiene algo que no sea letras, números,
 *   guiones o guiones bajos.
 * @throws {ApiError} Con `not_found` si no existe y `unauthorized` si no hay sesión.
 */
export function getAdminProduct(api: ApiClient, id: string): Promise<AdminProduct> {
  assertResourceId(id, 'del producto')
  return unwrap(api.GET('/admin/products/{id}', { params: { path: { id } } }))
}

/**
 * Crea un producto. El back le asigna el código siguiente y las fechas; `expectedUpdatedAt` se
 * ignora.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Datos del formulario, con las fotos ya subidas.
 * @throws {ApiError} Con `validation` si un campo no sirve, la línea no existe (`categoryId`) o
 *   una foto no existe (`images.N.publicId`); `conflict` (`slug_taken`) si otro producto usa el
 *   slug, también como slug anterior; `unauthorized` sin sesión y `forbidden` (`csrf_invalid`)
 *   sin el token CSRF de la sesión.
 */
export function createAdminProduct(
  api: ApiClient,
  input: AdminProductInput,
): Promise<AdminProduct> {
  return unwrap(api.POST('/admin/products', { body: input }))
}

/**
 * Guarda los cambios de un producto. Con `status: 'published'` vuelve a publicar uno archivado;
 * si cambia el slug, el anterior queda en `previousSlugs` y la tienda lo redirige.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador del producto.
 * @param input - Datos del formulario; con `expectedUpdatedAt` (el `updatedAt` con el que se
 *   abrió) no pisa los cambios de otra pestaña.
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Con `conflict` `product_changed` si el producto cambió desde
 *   `expectedUpdatedAt` (no guarda nada) o `slug_taken` si otro producto usa el slug; `not_found`
 *   si no existe; `validation` como {@link createAdminProduct}; `unauthorized` y `forbidden`
 *   (`csrf_invalid`) como cualquier escritura.
 */
export function updateAdminProduct(
  api: ApiClient,
  id: string,
  input: AdminProductInput,
): Promise<AdminProduct> {
  assertResourceId(id, 'del producto')
  return unwrap(api.PATCH('/admin/products/{id}', { params: { path: { id } }, body: input }))
}

/**
 * Archiva un producto: deja de verse en la tienda. Archivar uno archivado no cambia nada.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador del producto.
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Con `not_found` si no existe; `unauthorized` sin sesión y `forbidden`
 *   (`csrf_invalid`) sin el token CSRF de la sesión.
 */
export function archiveAdminProduct(api: ApiClient, id: string): Promise<AdminProduct> {
  assertResourceId(id, 'del producto')
  return unwrap(api.POST('/admin/products/{id}/archive', { params: { path: { id } } }))
}
