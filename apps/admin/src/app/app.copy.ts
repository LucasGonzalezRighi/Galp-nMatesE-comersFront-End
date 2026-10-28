/**
 * Elige el singular o el plural de un contador.
 *
 * @param count - Cantidad, entero mayor que 0.
 * @param singular - Texto para 1 (sin el número).
 * @param plural - Texto para el resto (sin el número).
 * @returns Por ejemplo "1 pendiente" o "4 pendientes".
 * @throws {RangeError} Si `count` no es un entero mayor que 0.
 */
function counted(count: number, singular: string, plural: string): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `El contador tiene que ser un entero mayor que 0; se recibió ${String(count)}.`,
    )
  }
  return `${String(count)} ${count === 1 ? singular : plural}`
}

/** Textos de la estructura del dashboard: barra lateral, barra superior, cajón y avisos. */
export const APP_COPY = {
  skipToContent: 'Saltar al contenido',
  brand: 'Galpón Mates',
  adminBadge: 'Admin',
  mockBadge: 'Modo de prueba',
  notPersistent: 'Sin persistencia: los cambios se pierden al recargar.',
  navLabel: 'Principal',
  openMenu: 'Menú',
  closeMenu: 'Cerrar menú',
  menuTitle: 'Menú',
  viewStore: 'Ver tienda',
  myAccount: 'Mi cuenta',
  logout: 'Cerrar sesión',
  loggingOut: 'Cerrando sesión…',
  logoutFailed: 'No pudimos cerrar la sesión, probá de nuevo.',
  csrfRefreshed: 'Actualizamos tu sesión. Probá de nuevo.',
  notFoundTitle: 'No encontramos esa página',
  backHome: 'Volver al inicio',
  errorTitle: 'Algo salió mal',
  unexpectedError: 'Ocurrió un error inesperado.',
  nav: {
    home: 'Resumen',
    orders: 'Pedidos',
    products: 'Productos',
    categories: 'Líneas',
    content: 'Contenido',
    reviews: 'Reseñas',
    messages: 'Mensajes',
    settings: 'Ajustes',
  },
  /** Lo que se agrega al nombre de un enlace con contador: "Pedidos, 3 para despachar". */
  counters: {
    ordersToShip: (count: number) => counted(count, 'para despachar', 'para despachar'),
    pendingReviews: (count: number) => counted(count, 'pendiente', 'pendientes'),
    unreadMessages: (count: number) => counted(count, 'sin leer', 'sin leer'),
  },
} as const
