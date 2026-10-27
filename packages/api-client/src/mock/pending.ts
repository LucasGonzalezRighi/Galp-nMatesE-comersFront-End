import type { paths } from '../generated/schema'
import type { HttpMethod } from './http'

/** Operación del contrato que el modo de prueba no atiende: responde `501`. */
export interface PendingOperation {
  /** Método HTTP. */
  method: HttpMethod
  /** Ruta del contrato. */
  path: keyof paths
}

/**
 * Operaciones del contrato que el modo de prueba todavía no atiende y responden `501` con
 * `detail: 'Todavía no está en el modo de prueba'`. Desde P4 no queda ninguna.
 *
 * Junto con `IMPLEMENTED_ROUTES` y {@link BACKEND_ONLY_OPERATIONS} cubre el contrato entero:
 * `contract-coverage.test.ts` falla si una operación del YAML no está en ninguna de las tres
 * listas o está en más de una.
 */
export const PENDING_OPERATIONS: readonly PendingOperation[] = []

/**
 * Operaciones del contrato que solo atiende el back: el modo de prueba responde `501` con
 * `detail: 'Lo atiende solo el back'`.
 *
 * El aviso de Mercado Pago solo lo llama Mercado Pago; en el modo de prueba lo reemplaza el
 * simulador (`POST /__mock/mercadopago/resolve`).
 */
export const BACKEND_ONLY_OPERATIONS: readonly PendingOperation[] = [
  { method: 'POST', path: '/webhooks/mercadopago' },
]
