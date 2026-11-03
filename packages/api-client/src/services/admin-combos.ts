import type { ApiClient } from '../client'
import type { Combo, ComboInput } from '../generated/schema'
import { unwrap, unwrapVoid } from '../unwrap'
import { assertResourceId } from './validation'

/** Dueño del identificador en los mensajes de {@link assertResourceId}. */
const OWNER = 'del combo'

/**
 * Lista todos los combos del dashboard (borradores y publicados), por posición.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Con `unauthorized` si no hay sesión.
 */
export function listAdminCombos(api: ApiClient): Promise<Combo[]> {
  return unwrap(api.GET('/admin/combos'))
}

/**
 * Crea un combo al final del listado.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Datos del formulario (`comboFormSchema`).
 * @throws {ApiError} Con `validation` si un campo no sirve: además de la forma, el servidor
 *   revisa que cada producto esté publicado y con precio (`productIds.N`), que sean de grupos
 *   distintos (`productIds`) y que el precio sea menor que la suma (`priceArs`); `unauthorized`
 *   sin sesión y `forbidden` (`csrf_invalid`) sin el token CSRF de la sesión.
 */
export function createAdminCombo(api: ApiClient, input: ComboInput): Promise<Combo> {
  return unwrap(api.POST('/admin/combos', { body: input }))
}

/**
 * Guarda el combo completo; conserva su posición.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador del combo (`cmb-…`).
 * @param input - Datos del formulario.
 * @returns Una promesa que se rechaza con `RangeError` si el identificador no sirve para armar la
 *   ruta (sin ir a la red).
 * @throws {ApiError} Con `not_found` si no existe; `validation`, `unauthorized` y `forbidden`
 *   (`csrf_invalid`) como {@link createAdminCombo}.
 */
export async function updateAdminCombo(
  api: ApiClient,
  id: string,
  input: ComboInput,
): Promise<Combo> {
  assertResourceId(id, OWNER)
  return unwrap(api.PATCH('/admin/combos/{id}', { params: { path: { id } }, body: input }))
}

/**
 * Borra un combo; los demás se renumeran. Los pedidos guardan su copia y los carritos que lo tienen
 * lo cotizan como `unavailable`.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador del combo.
 * @returns Una promesa que se rechaza con `RangeError` si el identificador no sirve.
 * @throws {ApiError} Con `not_found` si no existe; `unauthorized` sin sesión y `forbidden`
 *   (`csrf_invalid`) sin el token CSRF de la sesión.
 */
export async function deleteAdminCombo(api: ApiClient, id: string): Promise<void> {
  assertResourceId(id, OWNER)
  return unwrapVoid(api.DELETE('/admin/combos/{id}', { params: { path: { id } } }))
}

/**
 * Guarda el orden de los combos, que es el de la tienda.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param ids - Identificadores de todos los combos, una vez cada uno, en el orden nuevo.
 * @returns Una promesa que se rechaza con `RangeError` si la lista está vacía o algún
 *   identificador no sirve.
 * @throws {ApiError} Con `validation` en `ids` si no son exactamente todos los combos, una vez
 *   cada uno; `unauthorized` sin sesión y `forbidden` (`csrf_invalid`) sin el token CSRF.
 */
export async function reorderAdminCombos(api: ApiClient, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) throw new RangeError('El orden necesita al menos un combo')
  for (const id of ids) assertResourceId(id, OWNER)
  return unwrapVoid(api.PUT('/admin/combos/order', { body: { ids: [...ids] } }))
}
