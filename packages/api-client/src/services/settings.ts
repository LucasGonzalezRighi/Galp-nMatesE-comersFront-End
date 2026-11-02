import type { ApiClient } from '../client'
import type { PublicSettings } from '../generated/schema'
import { unwrap } from '../unwrap'

/**
 * Trae los ajustes públicos de la tienda (contacto, envíos, vendedor).
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function getPublicSettings(api: ApiClient): Promise<PublicSettings> {
  return unwrap(api.GET('/settings/public'))
}
