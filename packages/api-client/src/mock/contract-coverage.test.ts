import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { IMPLEMENTED_ROUTES } from './handlers'
import { PENDING_OPERATIONS } from './pending'

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

  it('cada operación del contrato está implementada o pendiente', () => {
    expect(new Set([...implemented, ...pending])).toEqual(new Set(contract))
  })

  it('no repite operaciones ni mezcla implementadas con pendientes', () => {
    expect(new Set(implemented).size).toBe(implemented.length)
    expect(new Set(pending).size).toBe(pending.length)
    expect(implemented.filter((operation) => pending.includes(operation))).toEqual([])
  })

  it('no tiene rutas que no estén en el contrato', () => {
    expect(
      [...implemented, ...pending].filter((operation) => !contract.includes(operation)),
    ).toEqual([])
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

  it('reparte las pendientes según el plan', () => {
    const planOf = (operation: string) =>
      PENDING_OPERATIONS.find((pendingOperation) => key(pendingOperation) === operation)?.plan
    expect(planOf('POST /orders')).toBe('P3')
    expect(planOf('POST /webhooks/mercadopago')).toBe('P3')
    expect(planOf('GET /me')).toBe('P3')
    expect(planOf('POST /admin/products')).toBe('P4')
  })
})
