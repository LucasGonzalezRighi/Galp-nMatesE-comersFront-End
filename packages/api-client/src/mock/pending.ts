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
  // P3: carrito, envío, pedidos, pagos, webhooks y cuenta de clientes.
  ...pending('P3', [
    ['POST', '/cart/quote'],
    ['POST', '/shipping/quote'],
    ['POST', '/orders'],
    ['GET', '/orders/{number}'],
    ['POST', '/orders/{number}/payments/mercadopago/preference'],
    ['POST', '/orders/{number}/payments/mercadopago/card'],
    ['POST', '/webhooks/mercadopago'],
    ['GET', '/auth/csrf'],
    ['POST', '/auth/register'],
    ['POST', '/auth/login'],
    ['POST', '/auth/logout'],
    ['POST', '/auth/password/forgot'],
    ['POST', '/auth/password/reset'],
    ['GET', '/me'],
    ['PATCH', '/me'],
    ['GET', '/me/orders'],
    ['GET', '/me/orders/{number}'],
    ['GET', '/me/addresses'],
    ['POST', '/me/addresses'],
    ['PATCH', '/me/addresses/{id}'],
    ['DELETE', '/me/addresses/{id}'],
  ]),
  // P4: el resto del dashboard.
  ...pending('P4', [
    ['POST', '/admin/auth/password'],
    ['GET', '/admin/dashboard/summary'],
    ['POST', '/admin/products'],
    ['GET', '/admin/products/{id}'],
    ['PATCH', '/admin/products/{id}'],
    ['POST', '/admin/products/{id}/archive'],
    ['GET', '/admin/categories'],
    ['POST', '/admin/categories'],
    ['PUT', '/admin/categories/order'],
    ['PATCH', '/admin/categories/{id}'],
    ['DELETE', '/admin/categories/{id}'],
    ['POST', '/admin/media/signature'],
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
