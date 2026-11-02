import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { IMPLEMENTED_ROUTES } from './handlers'
import { BACKEND_ONLY_OPERATIONS, PENDING_OPERATIONS } from './pending'

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

/** Las operaciones del contrato como `MÉTODO /ruta`. */
function contractOperations(): string[] {
  const text = readFileSync(new URL('../../../../docs/api/openapi.yaml', import.meta.url), 'utf8')
  const document = parse(text) as { paths: Record<string, Record<string, unknown>> }
  return Object.entries(document.paths).flatMap(([path, item]) =>
    METHODS.filter((method) => method in item).map((method) => `${method.toUpperCase()} ${path}`),
  )
}

function key(operation: { method: string; path: string }): string {
  return `${operation.method} ${operation.path}`
}

describe('cobertura del contrato', () => {
  const contract = contractOperations()
  const implemented = IMPLEMENTED_ROUTES.map(key)
  const pending = PENDING_OPERATIONS.map(key)
  const backendOnly = BACKEND_ONLY_OPERATIONS.map(key)
  const all = [...implemented, ...pending, ...backendOnly]

  it('cada operación del contrato está implementada, pendiente o es solo del back', () => {
    expect(new Set(all)).toEqual(new Set(contract))
  })

  it('no repite operaciones ni las pone en dos listas', () => {
    expect(new Set(all).size).toBe(all.length)
  })

  it('no tiene rutas que no estén en el contrato', () => {
    expect(all.filter((operation) => !contract.includes(operation))).toEqual([])
  })

  it('no quedan operaciones pendientes y el aviso de Mercado Pago lo atiende solo el back', () => {
    expect(pending).toEqual([])
    expect(backendOnly).toEqual(['POST /webhooks/mercadopago'])
  })

  it('atiende los formularios públicos de P2', () => {
    for (const operation of [
      'POST /contact',
      'POST /withdrawals',
      'POST /products/{slug}/reviews',
    ]) {
      expect(implemented).toContain(operation)
      expect(pending).not.toContain(operation)
    }
  })

  it('atiende el checkout y la cuenta de P3', () => {
    for (const operation of [
      'POST /cart/quote',
      'POST /shipping/quote',
      'POST /orders',
      'GET /orders/{number}',
      'POST /orders/{number}/payments/mercadopago/preference',
      'POST /orders/{number}/payments/mercadopago/card',
      'POST /orders/{number}/payments/mercadopago/installments',
      'POST /orders/{number}/cancel-payment',
      'GET /auth/csrf',
      'POST /auth/register',
      'GET /me',
      'DELETE /me/addresses/{id}',
    ]) {
      expect(implemented).toContain(operation)
      expect(pending).not.toContain(operation)
    }
  })

  it('atiende la sesión, los productos, las líneas y las fotos del dashboard de P4', () => {
    for (const operation of [
      'POST /admin/auth/password',
      'POST /admin/products',
      'GET /admin/products/{id}',
      'PATCH /admin/products/{id}',
      'POST /admin/products/{id}/archive',
      'GET /admin/categories',
      'POST /admin/categories',
      'PUT /admin/categories/order',
      'PATCH /admin/categories/{id}',
      'DELETE /admin/categories/{id}',
      'POST /admin/media/signature',
    ]) {
      expect(implemented).toContain(operation)
      expect(pending).not.toContain(operation)
    }
  })

  it('atiende los pedidos, el resumen, el contenido, los ajustes y la moderación de P4', () => {
    for (const operation of [
      'GET /admin/dashboard/summary',
      'GET /admin/orders',
      'GET /admin/orders/{number}',
      'POST /admin/orders/{number}/status',
      'GET /admin/content/home',
      'PUT /admin/content/about',
      'PUT /admin/content/legal/{document}',
      'GET /admin/settings',
      'PUT /admin/settings',
      'GET /admin/reviews',
      'PATCH /admin/reviews/{id}',
      'GET /admin/messages',
      'PATCH /admin/messages/{id}',
    ]) {
      expect(implemented).toContain(operation)
    }
  })
})
