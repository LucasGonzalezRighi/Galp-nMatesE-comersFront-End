import { describe, expect, it } from 'vitest'
import { DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { parseAdminEnv } from './env'

describe('parseAdminEnv', () => {
  it('sin variables arranca en modo de prueba con las credenciales de fábrica', () => {
    expect(parseAdminEnv({})).toEqual({
      apiMode: 'mock',
      apiBaseUrl: null,
      storeUrl: 'http://localhost:3000',
      mockAdminEmail: DEFAULT_MOCK_DB_OPTIONS.adminEmail,
      mockAdminPassword: DEFAULT_MOCK_DB_OPTIONS.adminPassword,
      mockLatencyMs: [150, 400],
    })
  })

  it('trata una variable vacía como ausente', () => {
    const env = parseAdminEnv({ VITE_API_MODE: '', VITE_MOCK_ADMIN_EMAIL: '' })
    expect(env.apiMode).toBe('mock')
    expect(env.mockAdminEmail).toBe(DEFAULT_MOCK_DB_OPTIONS.adminEmail)
  })

  it('toma las credenciales, la tienda y la latencia de las variables', () => {
    const env = parseAdminEnv({
      VITE_MOCK_ADMIN_EMAIL: 'otra@galponmates.com.ar',
      VITE_MOCK_ADMIN_PASSWORD: 'otra-clave',
      VITE_STORE_URL: 'https://galponmates.com.ar/',
      VITE_MOCK_LATENCY_MS: '0',
    })
    expect(env.mockAdminEmail).toBe('otra@galponmates.com.ar')
    expect(env.mockAdminPassword).toBe('otra-clave')
    expect(env.storeUrl).toBe('https://galponmates.com.ar')
    expect(env.mockLatencyMs).toBe(0)
  })

  it('acepta la latencia como rango', () => {
    expect(parseAdminEnv({ VITE_MOCK_LATENCY_MS: '100-300' }).mockLatencyMs).toEqual([100, 300])
  })

  it('en modo live exige VITE_API_BASE_URL', () => {
    expect(() => parseAdminEnv({ VITE_API_MODE: 'live' })).toThrow(
      'VITE_API_BASE_URL es obligatoria cuando VITE_API_MODE=live',
    )
  })

  it('en modo live devuelve la URL de la API sin barra final', () => {
    const env = parseAdminEnv({
      VITE_API_MODE: 'live',
      VITE_API_BASE_URL: 'https://api.galponmates.com.ar/',
    })
    expect(env.apiMode).toBe('live')
    expect(env.apiBaseUrl).toBe('https://api.galponmates.com.ar')
  })

  it.each([
    ['VITE_API_MODE', 'demo'],
    ['VITE_STORE_URL', 'galponmates.com.ar'],
    ['VITE_API_BASE_URL', 'ftp://api.galponmates.com.ar'],
    ['VITE_MOCK_LATENCY_MS', 'rapido'],
    ['VITE_MOCK_LATENCY_MS', '300-100'],
  ])('rechaza %s=%s con un mensaje que nombra la variable', (name, value) => {
    const source: Record<string, string> = { VITE_API_MODE: 'live', VITE_API_BASE_URL: 'http://x' }
    source[name] = value
    expect(() => parseAdminEnv(source)).toThrow(RangeError)
    expect(() => parseAdminEnv(source)).toThrow(name)
  })
})
