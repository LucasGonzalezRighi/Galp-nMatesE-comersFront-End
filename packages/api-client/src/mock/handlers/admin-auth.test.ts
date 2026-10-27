import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../../client'
import type { AdminProductInput } from '../../generated/schema'
import {
  adminLogin,
  adminLogout,
  archiveAdminProduct,
  changeAdminPassword,
  createAdminCategory,
  createAdminProduct,
  createMediaSignature,
  deleteAdminCategory,
  getAdminCsrfToken,
  getAdminSession,
  reorderAdminCategories,
  updateAdminCategory,
  updateAdminProduct,
} from '../../services'
import { createMockApi, loginAsAdmin, rawRequest } from '../../test/mock-api'
import { DEFAULT_MOCK_DB_OPTIONS } from '../db'

const NOW = new Date('2026-10-21T12:00:00Z')
const HOUR = 60 * 60 * 1000

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /admin/auth/login', () => {
  it('responde 401 con la contraseña incorrecta', async () => {
    const { api, db } = createMockApi()
    await expect(
      adminLogin(api, { email: DEFAULT_MOCK_DB_OPTIONS.adminEmail, password: 'otra-clave' }),
    ).rejects.toMatchObject({
      status: 401,
      problem: {
        type: 'invalid_credentials',
        title: 'Credenciales incorrectas',
        detail: 'Email o contraseña incorrectos.',
      },
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

  it('sin crypto.randomUUID (HTTP por la red local) igual crea el token CSRF', async () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const { api } = createMockApi()
    const result = await adminLogin(api, {
      email: DEFAULT_MOCK_DB_OPTIONS.adminEmail,
      password: DEFAULT_MOCK_DB_OPTIONS.adminPassword,
    })
    expect(result.csrfToken).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
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
    expect(await withoutCsrf.json()).toMatchObject({
      type: 'csrf_invalid',
      title: 'Token CSRF inválido',
      status: 403,
      detail: 'El token CSRF falta o no es válido.',
    })

    const wrongCsrf = await rawRequest(mock, '/admin/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'otro-token' },
    })
    expect(wrongCsrf.status).toBe(403)

    await adminLogout(mock.api)
    expect(mock.db.adminSession).toBeNull()
    await expect(getAdminSession(mock.api)).rejects.toMatchObject({ status: 401 })
  })

  it('logout con el token CSRF correcto responde 204 sin cuerpo y cierra la sesión', async () => {
    const mock = createMockApi()
    const csrfToken = await loginAsAdmin(mock)
    const response = await rawRequest(mock, '/admin/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(mock.db.adminSession).toBeNull()
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

describe('POST /admin/auth/password', () => {
  const NEW_PASSWORD = 'mate-con-yerba-2027'

  it('con la contraseña actual correcta la cambia y la sesión sigue abierta', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    await changeAdminPassword(mock.api, {
      currentPassword: DEFAULT_MOCK_DB_OPTIONS.adminPassword,
      newPassword: NEW_PASSWORD,
      confirmation: NEW_PASSWORD,
    })
    expect(mock.db.adminAccount.password).toBe(NEW_PASSWORD)
    await expect(getAdminSession(mock.api)).resolves.toMatchObject({
      email: DEFAULT_MOCK_DB_OPTIONS.adminEmail,
    })
    await expect(
      adminLogin(mock.api, { email: DEFAULT_MOCK_DB_OPTIONS.adminEmail, password: NEW_PASSWORD }),
    ).resolves.toMatchObject({ email: DEFAULT_MOCK_DB_OPTIONS.adminEmail })
  })

  it('responde 422 en currentPassword si la actual no es correcta', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    await expect(
      changeAdminPassword(mock.api, {
        currentPassword: 'otra-clave',
        newPassword: NEW_PASSWORD,
        confirmation: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { currentPassword: 'La contraseña actual no es correcta' },
    })
    expect(mock.db.adminAccount.password).toBe(DEFAULT_MOCK_DB_OPTIONS.adminPassword)
  })

  it('responde 422 en confirmation si no coincide con la nueva', async () => {
    const mock = createMockApi()
    await loginAsAdmin(mock)
    await expect(
      changeAdminPassword(mock.api, {
        currentPassword: DEFAULT_MOCK_DB_OPTIONS.adminPassword,
        newPassword: NEW_PASSWORD,
        confirmation: 'otra-cosa-2027',
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { confirmation: expect.any(String) as unknown },
    })
  })
})

/** Producto válido para las escrituras de la tabla de guardias. */
const PRODUCT: AdminProductInput = {
  categoryId: 'cat-torpedos',
  name: 'Mate de Prueba',
  slug: 'mate-de-prueba',
  description: 'Un mate de prueba para las guardias.',
  priceArs: 1000,
  stock: 1,
  featured: false,
  status: 'draft',
  images: [],
}

/** Cada escritura del admin de la API simulada I, con datos que de otro modo serían válidos. */
const WRITES: readonly [string, (api: ApiClient) => Promise<unknown>][] = [
  [
    'POST /admin/auth/password',
    (api) =>
      changeAdminPassword(api, {
        currentPassword: DEFAULT_MOCK_DB_OPTIONS.adminPassword,
        newPassword: 'mate-con-yerba-2027',
        confirmation: 'mate-con-yerba-2027',
      }),
  ],
  ['POST /admin/products', (api) => createAdminProduct(api, PRODUCT)],
  ['PATCH /admin/products/{id}', (api) => updateAdminProduct(api, 'prd-imperial-premium', PRODUCT)],
  ['POST /admin/products/{id}/archive', (api) => archiveAdminProduct(api, 'prd-imperial-premium')],
  [
    'POST /admin/categories',
    (api) =>
      createAdminCategory(api, {
        name: 'Nueva',
        slug: 'nueva',
        group: 'mate',
        blurb: '',
        image: null,
      }),
  ],
  [
    'PATCH /admin/categories/{id}',
    (api) =>
      updateAdminCategory(api, 'cat-yerbas', {
        name: 'Yerbas',
        slug: 'yerbas',
        group: 'yerba',
        blurb: '',
        image: null,
      }),
  ],
  ['DELETE /admin/categories/{id}', (api) => deleteAdminCategory(api, 'cat-yerbas')],
  ['PUT /admin/categories/order', (api) => reorderAdminCategories(api, ['cat-yerbas'])],
  ['POST /admin/media/signature', (api) => createMediaSignature(api, 'product')],
]

describe('guardias de las escrituras del admin', () => {
  it.each(WRITES)('%s sin sesión responde 401', async (_operation, write) => {
    await expect(write(createMockApi().api)).rejects.toMatchObject({ status: 401 })
  })

  it.each(WRITES)(
    '%s con un token CSRF que no es el de la sesión responde 403',
    async (_operation, write) => {
      const mock = createMockApi()
      await loginAsAdmin(mock)
      mock.setCsrfToken('otro-token')
      await expect(write(mock.api)).rejects.toMatchObject({
        status: 403,
        problem: { type: 'csrf_invalid' },
      })
      expect(mock.db.products).toHaveLength(27)
      expect(mock.db.categories).toHaveLength(6)
      expect(mock.db.adminAccount.password).toBe(DEFAULT_MOCK_DB_OPTIONS.adminPassword)
    },
  )
})
