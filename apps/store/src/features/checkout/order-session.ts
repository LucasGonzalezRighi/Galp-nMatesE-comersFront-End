import { isOrderNumber } from '@galpon/domain'

/** Clave de `sessionStorage` donde queda el pedido en curso (spec 14.2). */
export const ORDER_SESSION_KEY = 'galpon.order'

/** Pedido creado por el checkout, lo que hace falta para pagarlo y para ver su resultado. */
export interface OrderSession {
  /** Número del pedido (`GLP-` y cinco dígitos). */
  number: string
  /** Token del pedido; viaja en la cabecera `X-Order-Token`, nunca en la URL. */
  orderToken: string
  /** Resumen del carrito (`cartHash`) al crear el pedido, para saber si cambió después. */
  cartHash: string
}

/** Si un valor leído de `sessionStorage` tiene la forma de {@link OrderSession}. */
function isOrderSession(value: unknown): value is OrderSession {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.number === 'string' &&
    isOrderNumber(record.number) &&
    typeof record.orderToken === 'string' &&
    record.orderToken.length > 0 &&
    typeof record.cartHash === 'string'
  )
}

/** `sessionStorage` si existe y se puede usar; `null` en el servidor o en modo privado. */
function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/**
 * Guarda el pedido en curso para esta pestaña: el checkout lo escribe después del `201` de
 * `POST /orders`, y lo leen el paso de pago, `/checkout/resultado` y `/pedido/{numero}`.
 *
 * @param session - Pedido a guardar.
 * @throws {RangeError} Si el número no tiene formato o el token está vacío.
 */
export function saveOrderSession(session: OrderSession): void {
  if (!isOrderNumber(session.number)) {
    throw new RangeError(
      `number tiene que ser un número de pedido (GLP- y cinco dígitos), y recibió ${JSON.stringify(session.number)}`,
    )
  }
  if (session.orderToken.length === 0) throw new RangeError('orderToken no puede estar vacío')
  storage()?.setItem(ORDER_SESSION_KEY, JSON.stringify(session))
}

/**
 * Pedido en curso de esta pestaña, o `null` si no hay ninguno o lo guardado no sirve (se
 * descarta en silencio: el resultado muestra "No encontramos ese pedido").
 */
export function readOrderSession(): OrderSession | null {
  const raw = storage()?.getItem(ORDER_SESSION_KEY)
  if (raw === undefined || raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isOrderSession(parsed)) return null
    return { number: parsed.number, orderToken: parsed.orderToken, cartHash: parsed.cartHash }
  } catch {
    return null
  }
}

/** Olvida el pedido en curso (por ejemplo al empezar uno nuevo con otro carrito). */
export function clearOrderSession(): void {
  storage()?.removeItem(ORDER_SESSION_KEY)
}

/**
 * Token del pedido en curso, el `getOrderToken` del cliente de la API del navegador: el cliente
 * lo manda en `X-Order-Token` solo en las rutas `/orders/{number}…`.
 *
 * @returns El token, o `undefined` si no hay pedido en curso.
 */
export function readOrderToken(): string | undefined {
  return readOrderSession()?.orderToken
}
