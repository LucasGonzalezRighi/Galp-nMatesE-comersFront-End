import type { CartQuoteInput, InstallmentsInput } from '../generated/schema'
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
  /** Todas las cotizaciones de carrito: el prefijo de {@link queryKeys.cartQuote}, para invalidarlas. */
  cartQuotes: () => ['cart', 'quote'] as const,
  /** Cotización de un carrito. */
  cartQuote: (input: CartQuoteInput) => ['cart', 'quote', input] as const,
  /** Un pedido, consultado con su token o con la sesión del dueño. */
  order: (number: string) => ['orders', number] as const,
  /** Cuotas de una tarjeta para un pedido. */
  installments: (number: string, input: InstallmentsInput) =>
    ['orders', number, 'installments', input] as const,
  /** Todo lo de la cuenta del cliente: se invalida entero después de iniciar o cerrar sesión. */
  account: () => ['account'] as const,
  /** Token anti-CSRF de la tienda. */
  customerCsrf: () => ['account', 'csrf'] as const,
  /** Datos del cliente con la sesión iniciada. */
  me: () => ['account', 'me'] as const,
  /** Una página de "Mis pedidos". */
  myOrders: (page: number) => ['account', 'orders', page] as const,
  /** Uno de los pedidos del cliente. */
  myOrder: (number: string) => ['account', 'order', number] as const,
  /** Libreta de direcciones del cliente. */
  myAddresses: () => ['account', 'addresses'] as const,
}
