import type { ApiClient } from '../client'
import type { Combo } from '../generated/schema'
import { unwrap } from '../unwrap'

/**
 * Lista los combos a la venta: los publicados con todas sus piezas publicadas y con precio, por
 * posición. Los que tienen una pieza sin stock vienen con `isSoldOut`.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function listCombos(api: ApiClient): Promise<Combo[]> {
  return unwrap(api.GET('/combos'))
}
