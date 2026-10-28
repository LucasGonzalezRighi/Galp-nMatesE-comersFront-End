import type { DashboardSummary } from '@galpon/api-client'

/** Tipo de una alerta de pago del resumen. */
type PaymentAlertKind = DashboardSummary['paymentAlerts'][number]['kind']

/**
 * Valida que una cantidad sea un entero mayor o igual a 0.
 *
 * @param count - La cantidad.
 * @throws {RangeError} Si no es un entero mayor o igual a 0.
 */
function assertCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(
      `La cantidad tiene que ser un entero mayor o igual a 0; se recibió ${String(count)}.`,
    )
  }
}

/** Textos de la feature `dashboard` (la pantalla "Resumen"). */
export const DASHBOARD_COPY = {
  title: 'Resumen',
  mockNote:
    'Estás en modo de prueba: los datos son de ejemplo y los cambios quedan solo en esta pestaña. La tienda no los ve hasta que exista el back.',
  salesHeading: 'Ventas',
  salesToday: 'Ventas de hoy',
  salesLast7Days: 'Últimos 7 días',
  pendingHeading: 'Para atender',
  ordersToShip: 'Para despachar',
  ordersToShipHint: 'Pagados o en preparación',
  viewOrders: 'Ver pedidos',
  pendingReviews: 'Reseñas pendientes',
  moderate: 'Moderar',
  unreadMessages: 'Mensajes sin leer',
  read: 'Leer',
  paymentAlerts: 'Alertas de pago',
  noPaymentAlerts: 'No hay alertas de pago.',
  alertKinds: {
    charged_back: 'Contracargo',
    in_dispute: 'Mediación',
    duplicate_payment: 'Pago duplicado',
  } satisfies Record<PaymentAlertKind, string>,
  viewOrder: 'Ver pedido',
  lowStock: 'Poco stock',
  /**
   * Explicación de "Poco stock" con el umbral de los ajustes.
   *
   * @param threshold - `lowStockThreshold` de los ajustes.
   * @throws {RangeError} Si no es un entero mayor o igual a 0.
   */
  lowStockDescription: (threshold: number): string => {
    assertCount(threshold)
    const units = threshold === 1 ? 'unidad' : 'unidades'
    return `Productos publicados con ${String(threshold)} ${units} o menos (se cambia en Ajustes).`
  },
  noLowStock: 'Ningún producto publicado tiene poco stock.',
  outOfStock: 'Sin stock',
  /**
   * Las unidades que le quedan a un producto con poco stock.
   *
   * @param stock - Unidades, mayor que 0 (con 0 se muestra "Sin stock").
   * @throws {RangeError} Si no es un entero mayor o igual a 0.
   */
  unitsLeft: (stock: number): string => {
    assertCount(stock)
    return stock === 1 ? 'Queda 1' : `Quedan ${String(stock)}`
  },
  edit: 'Editar',
  loadError: 'No pudimos cargar el resumen.',
  loading: 'Cargando el resumen…',
} as const
