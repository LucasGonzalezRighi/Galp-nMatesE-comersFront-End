import type { AdminProductQuery } from '../services'

/**
 * Claves de TanStack Query de los datos de la API.
 *
 * Son funciones para que cada clave se arme en un solo lugar y las consultas y las
 * invalidaciones (`queryClient.invalidateQueries({ queryKey: queryKeys.adminSession() })`) coincidan.
 */
export const queryKeys = {
  /** Líneas de producto. */
  categories: () => ['categories'] as const,
  /** Ajustes públicos de la tienda. */
  publicSettings: () => ['settings', 'public'] as const,
  /** Sesión del dashboard. */
  adminSession: () => ['admin', 'session'] as const,
  /** Token anti-CSRF del dashboard. */
  adminCsrf: () => ['admin', 'csrf'] as const,
  /** Una página del listado de productos del dashboard, según los filtros. */
  adminProducts: (query: AdminProductQuery) => ['admin', 'products', query] as const,
}
