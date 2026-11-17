import { afterEach, describe, expect, it, vi } from 'vitest'

/** Lo que hace el arranque en Node.js, espiado: acá no se valida el entorno ni se toca el disco. */
const node = vi.hoisted(() => ({
  calls: [] as string[],
}))

vi.mock('./instrumentation-node', () => ({
  validateEnvOrExit: () => {
    node.calls.push('validateEnvOrExit')
  },
  startRouteCacheLimitInProduction: () => {
    node.calls.push('startRouteCacheLimitInProduction')
    return true
  },
}))

const { register } = await import('./instrumentation')

afterEach(() => {
  vi.unstubAllEnvs()
  node.calls.length = 0
})

describe('register', () => {
  it('en Node.js valida el entorno y después arranca el tope de la caché de páginas', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')

    await register()

    expect(node.calls).toEqual(['validateEnvOrExit', 'startRouteCacheLimitInProduction'])
  })

  it('en el runtime Edge no hace nada (no tiene las APIs de Node.js)', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')

    await register()

    expect(node.calls).toEqual([])
  })
})
