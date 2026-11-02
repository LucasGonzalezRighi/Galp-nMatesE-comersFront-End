import { isOrderNumber } from '@galpon/domain'
import { isInternalPath } from './result-view'

/**
 * Ruta interna del simulador de Mercado Pago, vista desde el navegador: `/api/v1` más
 * `MOCK_MERCADOPAGO_RESOLVE_PATH` de `@galpon/api-client/mock` (un test lo verifica). Se copia
 * para no traer la API simulada entera al paquete del navegador.
 */
export const MOCK_RESOLVE_URL = '/api/v1/__mock/mercadopago/resolve'

/** Mensaje que el desafío simulado manda a la ventana padre al terminar. */
export const CHALLENGE_DONE_MESSAGE = { type: 'galpon:challenge-done' } as const

/** Resultados que se pueden elegir en el simulador. */
export type MockPaymentResult = 'approved' | 'pending' | 'rejected'

/** Pedido al simulador de Mercado Pago. */
export interface MockPaymentResolution {
  /** Número del pedido. */
  number: string
  /** Intento de la preferencia, o `null` para el intento activo (el desafío 3-D Secure). */
  intent: string | null
  /** Resultado elegido. */
  result: MockPaymentResult
}

/** Ventana desde la que se avisa el fin del desafío (la del iframe). */
export interface ChallengeFrame {
  /** Ventana que contiene el iframe; es la misma cuando la página no está embebida. */
  parent: { postMessage: (message: unknown, targetOrigin: string) => void }
  /** Dirección de la página, para mandar el aviso solo al mismo origen. */
  location: { origin: string }
}

/** Si la respuesta del simulador trae la dirección de regreso. */
function readReturnUrl(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const returnUrl: unknown = (body as Record<string, unknown>).returnUrl
  return typeof returnUrl === 'string' ? returnUrl : null
}

/**
 * Aplica el resultado elegido en el simulador de Mercado Pago (solo modo de prueba): hace de
 * Mercado Pago y de su aviso al back a la vez.
 *
 * @param input - Pedido, intento y resultado.
 * @param fetchImpl - `fetch` a usar; por omisión el del navegador.
 * @returns La dirección de regreso, `/checkout/resultado?pedido=GLP-…`.
 * @throws {RangeError} Si el número no tiene formato o el intento está vacío.
 * @throws {Error} Si la API responde con error (por ejemplo, el intento ya no está activo) o
 * devuelve una dirección de regreso que no es de la tienda.
 */
export async function resolveMockPayment(
  input: MockPaymentResolution,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  if (!isOrderNumber(input.number)) {
    throw new RangeError(
      `number tiene que ser un número de pedido (GLP- y cinco dígitos), y recibió ${JSON.stringify(input.number)}`,
    )
  }
  if (input.intent?.length === 0) {
    throw new RangeError('intent tiene que ser null (el intento activo) o un identificador')
  }
  const response = await fetchImpl(MOCK_RESOLVE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error(`El simulador respondió ${String(response.status)}`)
  }
  const returnUrl = readReturnUrl(await response.json())
  if (returnUrl === null || !isInternalPath(returnUrl)) {
    throw new Error('El simulador no devolvió una dirección de regreso de la tienda')
  }
  return returnUrl
}

/**
 * Avisa a la página que abrió el desafío en un iframe que ya terminó, con el origen propio como
 * destino (nunca `*`).
 *
 * @param frame - Ventana del desafío; por omisión `window`.
 * @returns `true` si la página estaba embebida y se mandó el aviso.
 */
export function notifyChallengeDone(frame: ChallengeFrame = window): boolean {
  if (Object.is(frame.parent, frame)) return false
  frame.parent.postMessage(CHALLENGE_DONE_MESSAGE, frame.location.origin)
  return true
}

/**
 * Si un mensaje es el aviso de fin del desafío y viene del mismo origen.
 *
 * @param event - Mensaje recibido por `window`.
 * @param origin - Origen propio (`window.location.origin`).
 */
export function isChallengeDoneMessage(event: MessageEvent, origin: string): boolean {
  if (event.origin !== origin) return false
  const data: unknown = event.data
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === CHALLENGE_DONE_MESSAGE.type
  )
}
