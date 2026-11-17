import { describe, expect, it } from 'vitest'
import {
  allowsMockControls,
  MOCK_CONTROL_SECRET_HEADER,
  passwordResetNotice,
  storeMockAdminPassword,
} from './mock-access'

const SECRET = 'secreto-de-los-controles-de-prueba-0001'

/** Pedido a un control con la cabecera del secreto, si viene. */
function controlRequest(secret?: string): Request {
  return new Request('http://localhost/api/v1/__mock/products/prd-imperial-premium', {
    method: 'POST',
    headers: secret === undefined ? {} : { [MOCK_CONTROL_SECRET_HEADER]: secret },
  })
}

describe('allowsMockControls', () => {
  it('fuera de producción los controles andan para cualquiera', () => {
    const env = { mockInProduction: false, mockControlSecret: null }
    expect(allowsMockControls(env, controlRequest())).toBe(true)
  })

  it('en producción sin MOCK_CONTROL_SECRET no andan nunca', () => {
    const env = { mockInProduction: true, mockControlSecret: null }
    expect(allowsMockControls(env, controlRequest())).toBe(false)
    expect(allowsMockControls(env, controlRequest(SECRET))).toBe(false)
  })

  it('en producción con MOCK_CONTROL_SECRET andan solo con ese secreto en la cabecera', () => {
    const env = { mockInProduction: true, mockControlSecret: SECRET }
    expect(allowsMockControls(env, controlRequest(SECRET))).toBe(true)
    expect(allowsMockControls(env, controlRequest())).toBe(false)
    expect(allowsMockControls(env, controlRequest(`${SECRET}x`))).toBe(false)
    expect(allowsMockControls(env, controlRequest(''))).toBe(false)
  })
})

describe('storeMockAdminPassword', () => {
  it('con MOCK_ADMIN_PASSWORD usa esa, también en producción', () => {
    for (const mockInProduction of [false, true]) {
      expect(
        storeMockAdminPassword(
          { mockAdminPassword: 'mate-amargo-2027', mockInProduction },
          'de-fabrica-2026',
        ),
      ).toBe('mate-amargo-2027')
    }
  })

  it('sin ella, la de fábrica solo fuera de producción', () => {
    expect(
      storeMockAdminPassword(
        { mockAdminPassword: null, mockInProduction: false },
        'de-fabrica-2026',
      ),
    ).toBe('de-fabrica-2026')
  })

  it('en producción sin ella el admin queda cerrado: una contraseña al azar que nadie conoce', () => {
    const env = { mockAdminPassword: null, mockInProduction: true }
    const first = storeMockAdminPassword(env, 'de-fabrica-2026')
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(storeMockAdminPassword(env, 'de-fabrica-2026')).not.toBe(first)
  })
})

describe('passwordResetNotice', () => {
  it('arma la línea del log con el enlace de la tienda', () => {
    const token = `rt_${'a'.repeat(64)}`
    expect(
      passwordResetNotice('http://localhost:3000', {
        email: 'lucia@ejemplo.com',
        token,
        expiresAt: '2026-11-17T16:00:00.000Z',
      }),
    ).toBe(
      `[modo de prueba] Enlace para cambiar la contraseña de lucia@ejemplo.com (vence 2026-11-17T16:00:00.000Z): http://localhost:3000/cuenta/restablecer?token=${token}`,
    )
  })
})
