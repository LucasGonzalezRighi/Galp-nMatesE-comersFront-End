import type { MockRoute } from '../router'
import { accountRoutes } from './account'
import { adminAuthRoutes } from './admin-auth'
import { adminProductsRoutes } from './admin-products'
import { cartRoutes } from './cart'
import { catalogRoutes } from './catalog'
import { contactRoutes } from './contact'
import { contentRoutes } from './content'
import { ordersRoutes } from './orders'
import { paymentsRoutes } from './payments'
import { reviewsRoutes } from './reviews'
import { settingsRoutes } from './settings'

/**
 * Operaciones del contrato que el modo de prueba ya atiende: las de P1, los formularios de P2 y
 * el checkout y la cuenta de P3.
 */
export const IMPLEMENTED_ROUTES: readonly MockRoute[] = [
  ...catalogRoutes,
  ...reviewsRoutes,
  ...contactRoutes,
  ...contentRoutes,
  ...settingsRoutes,
  ...adminAuthRoutes,
  ...adminProductsRoutes,
  ...cartRoutes,
  ...ordersRoutes,
  ...paymentsRoutes,
  ...accountRoutes,
]
