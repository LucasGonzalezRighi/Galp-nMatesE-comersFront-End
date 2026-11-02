import type { CartQuoteInput, InstallmentsInput } from '../generated/schema'
import type {
  AdminContentPage,
  AdminMessageQuery,
  AdminOrderQuery,
  AdminProductQuery,
  AdminReviewQuery,
  LegalDocument,
} from '../services'

/**
 * Claves de TanStack Query de los datos de la API.
 *
 * Son funciones para que cada clave se arme en un solo lugar y las consultas y las
 * invalidaciones (`queryClient.invalidateQueries({ queryKey: queryKeys.adminSession() })`) coincidan.
 * Las del dashboard empiezan con `'admin'`; las que terminan en `All` son prefijos para invalidar
 * juntas todas las de un grupo (los listados y los detalles).
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
  /** Resumen del inicio del dashboard (y los contadores del menú). */
  adminDashboard: () => ['admin', 'dashboard'] as const,
  /** Todo lo de productos del dashboard: el prefijo de los listados y los detalles. */
  adminProductsAll: () => ['admin', 'products'] as const,
  /** Una página del listado de productos del dashboard, según los filtros. */
  adminProducts: (query: AdminProductQuery) => ['admin', 'products', query] as const,
  /** Un producto del dashboard. */
  adminProduct: (id: string) => ['admin', 'products', 'detail', id] as const,
  /** Líneas de producto del dashboard. */
  adminCategories: () => ['admin', 'categories'] as const,
  /** Todo lo de pedidos del dashboard: el prefijo de los listados y los detalles. */
  adminOrdersAll: () => ['admin', 'orders'] as const,
  /** Una página del listado de pedidos, según los filtros. */
  adminOrders: (query: AdminOrderQuery) => ['admin', 'orders', query] as const,
  /** Un pedido del dashboard. */
  adminOrder: (number: string) => ['admin', 'orders', 'detail', number] as const,
  /** Todo el contenido del sitio: el prefijo de las páginas y los documentos legales. */
  adminContentAll: () => ['admin', 'content'] as const,
  /** Una página de contenido (`home`, `about`, `faq`, `footer` o `product-tabs`). */
  adminContent: (page: AdminContentPage) => ['admin', 'content', page] as const,
  /** Un documento legal (`terms` o `privacy`). */
  adminLegalContent: (document: LegalDocument) => ['admin', 'content', 'legal', document] as const,
  /** Ajustes del dashboard. */
  adminSettings: () => ['admin', 'settings'] as const,
  /** Todas las reseñas del dashboard: el prefijo de los listados. */
  adminReviewsAll: () => ['admin', 'reviews'] as const,
  /** Una página de reseñas, según el filtro. */
  adminReviews: (query: AdminReviewQuery) => ['admin', 'reviews', query] as const,
  /** Toda la bandeja del dashboard: el prefijo de los listados. */
  adminMessagesAll: () => ['admin', 'messages'] as const,
  /** Una página de la bandeja, según los filtros. */
  adminMessages: (query: AdminMessageQuery) => ['admin', 'messages', query] as const,
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
