import type { MockRoute } from '../router'
import { adminAuthRoutes } from './admin-auth'
import { adminProductsRoutes } from './admin-products'
import { catalogRoutes } from './catalog'
import { contactRoutes } from './contact'
import { contentRoutes } from './content'
import { reviewsRoutes } from './reviews'
import { settingsRoutes } from './settings'

/** Operaciones del contrato que el modo de prueba ya atiende (las de P1 y los formularios de P2). */
export const IMPLEMENTED_ROUTES: readonly MockRoute[] = [
  ...catalogRoutes,
  ...reviewsRoutes,
  ...contactRoutes,
  ...contentRoutes,
  ...settingsRoutes,
  ...adminAuthRoutes,
  ...adminProductsRoutes,
]
