import type { MockRoute } from '../router'
import { accountRoutes } from './account'
import { adminAuthRoutes } from './admin-auth'
import { adminCategoriesRoutes } from './admin-categories'
import { adminContentRoutes } from './admin-content'
import { adminMediaRoutes } from './admin-media'
import { adminModerationRoutes } from './admin-moderation'
import { adminOrdersRoutes } from './admin-orders'
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
 * Operaciones del contrato que el modo de prueba atiende: las de P1, los formularios de P2, el
 * checkout y la cuenta de P3 y todo el dashboard de P4 (sesión, productos, líneas, fotos, pedidos,
 * resumen, contenido, ajustes y moderación). Solo queda afuera el aviso de Mercado Pago, que
 * atiende el back.
 */
export const IMPLEMENTED_ROUTES: readonly MockRoute[] = [
  ...catalogRoutes,
  ...reviewsRoutes,
  ...contactRoutes,
  ...contentRoutes,
  ...settingsRoutes,
  ...adminAuthRoutes,
  ...adminProductsRoutes,
  ...adminCategoriesRoutes,
  ...adminMediaRoutes,
  ...adminOrdersRoutes,
  ...adminContentRoutes,
  ...adminModerationRoutes,
  ...cartRoutes,
  ...ordersRoutes,
  ...paymentsRoutes,
  ...accountRoutes,
]
