import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from 'next/constants'
import { afterEach, describe, expect, it, vi } from 'vitest'
import nextConfig from '../next.config'
import { EnvError } from './lib/env'
import { STORE_IMAGES } from './lib/images'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('next.config', () => {
  it('el optimizador de imágenes usa STORE_IMAGES (patrones sin búsqueda, anchos, calidad y tope del caché)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_MODE', 'mock')
    vi.stubEnv('MOCK_ALLOWED_IN_PRODUCTION', 'true')

    expect(nextConfig(PHASE_PRODUCTION_SERVER).images).toBe(STORE_IMAGES)
  })

  it('en producción sin API_MODE no carga para servir (next start); sí para compilar (next build y next typegen)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('API_MODE', '')

    expect(() => nextConfig(PHASE_PRODUCTION_SERVER)).toThrow(EnvError)
    expect(() => nextConfig(PHASE_PRODUCTION_BUILD)).not.toThrow()
  })
})
