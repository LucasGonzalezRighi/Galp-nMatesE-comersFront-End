import { describe, expect, it } from 'vitest'
import { adminLogin, adminLogout, getAdminCsrfToken, getAdminSession } from '../../services'
import { createMockApi, loginAsAdmin, rawRequest } from '../../test/mock-api'
import { DEFAULT_MOCK_DB_OPTIONS } from '../db'

const NOW = new Date('2026-10-21T12:00:00Z')
const HOUR = 60 * 60 * 1000

describe('POST /admin/auth/login', () => {
  it('responde 401 con la contraseña incorrecta', async () => {
    const { api, db } = createMockApi()
    await expect(
      adminLogin(api, { email: DEFAULT_MOCK_DB_OPTIONS.adminEmail, password: 'otra-clave' }),
    ).rejects.toMatchObject({
      status: 401,
      problem: { title: 'Email o contraseña incorrectos' },
    })
    expect(db.adminSession).toBeNull()
  })

  it('responde 422 con los errores de cada campo si los datos no sirven', async () => {
    const { api } = createMockApi()
    await expect(adminLogin(api, { email: 'no-es-un-mail', password: '' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: {
        email: expect.any(String) as unknown,
        password: expect.any(String) as unknown,
      },
    })
  })

  it('con los datos correctos crea una sesión de 8 horas', async () => {
    const { api, db } = createMockApi({ now: () => NOW })
    const result = await adminLogin(api, {
      email: ` ${DEFAULT_MOCK_DB_OPTIONS.adminEmail.toUpperCase()} `,
      password: DEFAULT_MOCK_DB_OPTIONS.adminPassword,
    })
    expect(result).toEqual({
      email: DEFAULT_MOCK_DB_OPTIONS.adminEmail,
      csrfToken: expect.stringMatching(/^[0-9a-f-]{36}$/) as unknown,
      expiresAt: new Date(NOW.getTime() + 8 * HOUR).toISOString(),
    })
    expect(db.adminSession).toEqual(result)
  })
})

describe('sesión del admin', () => {
  it('después del login, me y csrf responden con la sesión', async () => {
    const mock = createMockApi()
    const csrfToken = await loginAsAdmin(mock)
    expect(await getAdminSession(mock.api)).toEqual({
      email: DEFAULT_MOCK_DB_OPTIONS.adminEmail,
      expiresAt: mock.db.adminSession?.expiresAt,
    })
    expect(await getAdminCsrfToken(mock.api)).toEqual({ csrfToken })
  })

  it('sin sesión, me y csrf responden 401', async () => {
    const { api } = createMockApi()
    await expect(getAdminSession(api)).rejects.toMatchObject({ status: 401 })
    await expect(getAdminCsrfToken(api)).rejects.toMatchObject({ status: 401 })
  })

  it('logout pide el token CSRF y después me responde 401', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    const withoutCsrf = await rawRequest(mock, '/admin/auth/logout', { method: 'POST' })
    expect(withoutCsrf.status).toBe(403)
    expect(await withoutCsrf.json()).toMatchObject({ type: 'forbidden', status: 403 })

    const wrongCsrf = await rawRequest(mock, '/admin/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'otro-token' },
    })
    expect(wrongCsrf.status).toBe(403)

    await adminLogout(mock.api)
    expect(mock.db.adminSession).toBeNull()
    await expect(getAdminSession(mock.api)).rejects.toMatchObject({ status: 401 })
  })

  it('una sesión vencida responde 401', async () => {
    let now = NOW
    const mock = createMockApi({ now: () => now })
    await loginAsAdmin(mock)
    now = new Date(NOW.getTime() + 9 * HOUR)
    await expect(getAdminSession(mock.api)).rejects.toMatchObject({
      status: 401,
      problem: { type: 'unauthorized' },
    })
  })
})
