import type { MockRoute } from '../router'
import { json } from '../http'
import { toPublicSettings } from '../mappers'
import { route } from '../router'

/** Ruta pública de ajustes: solo lo que la tienda puede mostrar. */
export const settingsRoutes: readonly MockRoute[] = [
  route('GET', '/settings/public', ({ db }) => json(toPublicSettings(db.settings))),
]
