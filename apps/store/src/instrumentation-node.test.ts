import type { MockInstance } from 'vitest'
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

const { MOCK_IN_PRODUCTION_WARNING, validateEnvOrExit } = await import('./instrumentation-node')

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
