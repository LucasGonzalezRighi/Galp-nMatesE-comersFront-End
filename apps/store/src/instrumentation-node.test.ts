import type { MockInstance } from 'vitest'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnvError } from './lib/env'

/** Lo que devuelve (o tira) `getStoreEnv` en cada prueba. */
const env = vi.hoisted((): { result: object } => ({ result: { mockInProduction: false } }))

vi.mock('./lib/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/env')>()),
  getStoreEnv: () => {
    if (env.result instanceof Error) throw env.result
    return env.result
  },
}))

/** El arranque del tope de la caché de páginas, espiado: acá no se toca el disco. */
const routeCache = vi.hoisted(() => ({ start: vi.fn() }))

vi.mock('./lib/route-cache-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/route-cache-limit')>()),
  startRouteCacheLimit: routeCache.start,
}))

const { MOCK_IN_PRODUCTION_WARNING, startRouteCacheLimitInProduction, validateEnvOrExit } =
  await import('./instrumentation-node')

let stderr: MockInstance
let exit: MockInstance

beforeEach(() => {
  stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateEnvOrExit', () => {
  it('con un entorno válido no escribe nada ni termina', () => {
    env.result = { mockInProduction: false }
    validateEnvOrExit()

    expect(stderr).not.toHaveBeenCalled()
    expect(exit).not.toHaveBeenCalled()
  })

  it('con la API simulada en producción avisa en el log que es inseguro y sigue', () => {
    env.result = { mockInProduction: true }
    validateEnvOrExit()

    expect(stderr).toHaveBeenCalledWith(`${MOCK_IN_PRODUCTION_WARNING}\n`)
    expect(MOCK_IN_PRODUCTION_WARNING).toMatch(/inseguro/)
    expect(exit).not.toHaveBeenCalled()
  })

  it('con un entorno inválido escribe los problemas y termina con 1', () => {
    env.result = new EnvError(['API_MODE es obligatoria en producción'])
    validateEnvOrExit()

    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('API_MODE es obligatoria'))
    expect(exit).toHaveBeenCalledWith(1)
  })
})

describe('startRouteCacheLimitInProduction', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    routeCache.start.mockClear()
  })

  it('en el servidor de producción arranca el tope con ROUTE_CACHE_MAX_MB y la carpeta de Next', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PHASE', 'phase-production-server')
    vi.stubEnv('VERCEL', '')
    env.result = { mockInProduction: false, routeCacheMaxBytes: 64 * 1024 * 1024 }

    expect(startRouteCacheLimitInProduction()).toBe(true)

    expect(routeCache.start).toHaveBeenCalledTimes(1)
    expect(routeCache.start).toHaveBeenCalledWith({
      directory: join(process.cwd(), '.next', 'server', 'route-cache'),
      maxBytes: 64 * 1024 * 1024,
    })
  })

  it('en Vercel no arranca: las páginas van a la caché de la plataforma, no a un disco propio', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PHASE', 'phase-production-server')
    vi.stubEnv('VERCEL', '1')
    env.result = { mockInProduction: false, routeCacheMaxBytes: 64 * 1024 * 1024 }

    expect(startRouteCacheLimitInProduction()).toBe(false)
    expect(routeCache.start).not.toHaveBeenCalled()
  })

  it.each([
    ['next dev', 'development', 'phase-development-server'],
    ['next build', 'production', 'phase-production-build'],
  ])('en %s no arranca nada', (_name, nodeEnv, phase) => {
    vi.stubEnv('NODE_ENV', nodeEnv)
    vi.stubEnv('NEXT_PHASE', phase)
    vi.stubEnv('VERCEL', '')
    env.result = { mockInProduction: false, routeCacheMaxBytes: 64 * 1024 * 1024 }

    expect(startRouteCacheLimitInProduction()).toBe(false)
    expect(routeCache.start).not.toHaveBeenCalled()
  })
})
