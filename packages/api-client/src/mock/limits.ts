/**
 * Topes de la base simulada. En la tienda la base es una sola para todo el proceso (ADR 0003) y la
 * comparten todos los que la visitan, así que cada colección que crece con pedidos sin sesión de
 * admin tiene un máximo: pasado el tope se descarta lo más viejo. Alcanzan de sobra para probar a
 * mano y para una corrida entera de las pruebas de punta a punta.
 */
export const MOCK_DB_LIMITS = {
  /** Sesiones de la tienda, anónimas y de clientes (`GET /auth/csrf` abre una sin cookie). */
  customerSessions: 10_000,
  /** Clientes con cuenta. */
  customers: 2_000,
  /** Direcciones de la libreta de cada cliente. */
  addressesPerCustomer: 20,
  /** Pedidos, de todos los estados. */
  orders: 2_000,
  /** Intentos de pago de cada pedido (cada pago rechazado agrega uno). */
  intentsPerOrder: 20,
  /** Mensajes de contacto y de arrepentimiento de la bandeja. */
  messages: 2_000,
  /** Reseñas pendientes de moderar; las aprobadas y las ocultas no se descartan. */
  pendingReviews: 1_000,
} as const

/**
 * Deja los últimos `limit` elementos: las listas de la base van de lo más viejo a lo más nuevo, así
 * que lo que se descarta es lo más viejo.
 *
 * @param items - Lista, de lo más viejo a lo más nuevo.
 * @param limit - Cuántos elementos quedan como máximo.
 * @returns La misma lista si no pasa el tope, o una nueva con los últimos `limit`.
 */
export function keepNewest<T>(items: T[], limit: number): T[] {
  return items.length > limit ? items.slice(items.length - limit) : items
}

/**
 * Próximo identificador correlativo (`cus-0001`, `msg-0002`…): el número que sigue al mayor de la
 * lista. Sale del mayor y no de la cantidad, así no repite uno después de descartar los más viejos.
 *
 * @param prefix - Comienzo del identificador, por ejemplo `msg-`.
 * @param ids - Identificadores que ya están en la base.
 * @param digits - Mínimo de dígitos del número (se completa con ceros a la izquierda).
 */
export function nextSequentialId(prefix: string, ids: readonly string[], digits: number): string {
  let last = 0
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue
    const number = Number(id.slice(prefix.length))
    if (Number.isSafeInteger(number) && number > last) last = number
  }
  return `${prefix}${String(last + 1).padStart(digits, '0')}`
}
