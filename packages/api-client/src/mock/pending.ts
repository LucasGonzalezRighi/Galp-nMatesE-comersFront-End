import type { paths } from '../generated/schema'
import type { HttpMethod } from './http'

/** Plan del proyecto en que el modo de prueba va a atender una operación. */
export type MockPlan = 'P3' | 'P4'

/** Operación del contrato que el modo de prueba todavía no atiende. */
export interface PendingOperation {
  /** Método HTTP. */
  method: HttpMethod
  /** Ruta del contrato. */
  path: keyof paths
  /** Plan en que llega; el 501 lo informa como `Llega en P2`. */
  plan: MockPlan
}

/** Una operación del contrato: método y ruta. */
type Operation = readonly [HttpMethod, keyof paths]

/** Marca varias operaciones como pendientes de un mismo plan. */
function pending(plan: MockPlan, operations: readonly Operation[]): PendingOperation[] {
  return operations.map(([method, path]) => ({ method, path, plan }))
}

/**
 * Operaciones del contrato que el modo de prueba responde con `501` hasta que llega su plan.
 *
 * Junto con `IMPLEMENTED_ROUTES` cubre el contrato entero: `contract-coverage.test.ts` falla si
 * una operación del YAML no está en alguna de las dos listas o está en las dos.
 */
export const PENDING_OPERATIONS: readonly PendingOperation[] = [
  // P3: el aviso de Mercado Pago solo lo llama Mercado Pago; en el modo de prueba lo reemplaza el
  // simulador (`POST /__mock/mercadopago/resolve`).
  ...pending('P3', [['POST', '/webhooks/mercadopago']]),
  // P4: el resto del dashboard (pedidos, resumen, contenido, ajustes y moderación).
  ...pending('P4', [
    ['GET', '/admin/dashboard/summary'],
    ['GET', '/admin/orders'],
    ['GET', '/admin/orders/{number}'],
    ['POST', '/admin/orders/{number}/status'],
    ['GET', '/admin/content/home'],
    ['PUT', '/admin/content/home'],
    ['GET', '/admin/content/about'],
    ['PUT', '/admin/content/about'],
    ['GET', '/admin/content/faq'],
    ['PUT', '/admin/content/faq'],
    ['GET', '/admin/content/footer'],
    ['PUT', '/admin/content/footer'],
    ['GET', '/admin/content/product-tabs'],
    ['PUT', '/admin/content/product-tabs'],
    ['GET', '/admin/content/legal/{document}'],
    ['PUT', '/admin/content/legal/{document}'],
    ['GET', '/admin/settings'],
    ['PUT', '/admin/settings'],
    ['GET', '/admin/reviews'],
    ['PATCH', '/admin/reviews/{id}'],
    ['GET', '/admin/messages'],
    ['PATCH', '/admin/messages/{id}'],
  ]),
]
