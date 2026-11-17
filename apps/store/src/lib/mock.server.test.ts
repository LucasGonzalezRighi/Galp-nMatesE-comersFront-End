import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MOCK_DB_OPTIONS, resetGlobalMockDb } from '@galpon/api-client/mock'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

const ORIGIN = 'http://localhost/api/v1'
const SECRET = 'secreto-de-los-controles-de-prueba-0001'

/** Entorno de un servidor de producción con la API simulada (como las pruebas de punta a punta). */
function stubProductionMock(extra: Record<string, string> = {}): void {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('API_MODE', 'mock')
  vi.stubEnv('MOCK_ALLOWED_IN_PRODUCTION', 'true')
  for (const [name, value] of Object.entries(extra)) vi.stubEnv(name, value)
}

/** El `fetch` simulado de la tienda, armado con el entorno de cada prueba. */
async function storeFetch() {
  const { getStoreMockFetch } = await import('./mock.server')
  return getStoreMockFetch()
}

/** Login del admin con esa contraseña. */
function adminLogin(password: string): Request {
  return new Request(`${ORIGIN}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEFAULT_MOCK_DB_OPTIONS.adminEmail, password }),
  })
}

/** Cambio de stock por el control de escenarios, con el secreto si viene. */
function changeStock(secret?: string): Request {
  return new Request(`${ORIGIN}/__mock/products/prd-imperial-premium`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret === undefined ? {} : { 'X-Mock-Control-Secret': secret }),
    },
    body: JSON.stringify({ stock: 3 }),
  })
}

let stdout: MockInstance

beforeEach(() => {
  vi.resetModules()
  resetGlobalMockDb()
  vi.stubEnv('MOCK_LATENCY_MS', '0')
  stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  resetGlobalMockDb()
})

describe('getStoreMockFetch: el admin de la API simulada', () => {
  it('fuera de producción entra con la contraseña de fábrica', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fetch = await storeFetch()
    expect((await fetch(adminLogin(DEFAULT_MOCK_DB_OPTIONS.adminPassword))).status).toBe(200)
  })

  it('en producción sin MOCK_ADMIN_PASSWORD queda cerrado: la de fábrica da 401', async () => {
    stubProductionMock()
    const fetch = await storeFetch()
    expect((await fetch(adminLogin(DEFAULT_MOCK_DB_OPTIONS.adminPassword))).status).toBe(401)
  })

  it('con MOCK_ADMIN_PASSWORD entra con esa y no con la de fábrica', async () => {
    stubProductionMock({ MOCK_ADMIN_PASSWORD: 'mate-amargo-2027' })
    const fetch = await storeFetch()
    expect((await fetch(adminLogin(DEFAULT_MOCK_DB_OPTIONS.adminPassword))).status).toBe(401)
    expect((await fetch(adminLogin('mate-amargo-2027'))).status).toBe(200)
  })
})

describe('getStoreMockFetch: los controles de escenarios', () => {
  it('fuera de producción andan sin secreto', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fetch = await storeFetch()
    expect((await fetch(changeStock())).status).toBe(200)
  })

  it('en producción responden 404 sin su cabecera o con otro secreto, y andan con el de MOCK_CONTROL_SECRET', async () => {
    stubProductionMock({ MOCK_CONTROL_SECRET: SECRET })
    const fetch = await storeFetch()
    expect((await fetch(changeStock())).status).toBe(404)
    expect((await fetch(changeStock('otro-secreto'))).status).toBe(404)
    expect((await fetch(changeStock(SECRET))).status).toBe(200)
  })

  it('en producción sin MOCK_CONTROL_SECRET no andan ni con la cabecera', async () => {
    stubProductionMock()
    const fetch = await storeFetch()
    expect((await fetch(changeStock(SECRET))).status).toBe(404)
  })
})

describe('getStoreMockFetch: el enlace para cambiar la contraseña', () => {
  it('lo escribe en el log del servidor, que hace las veces del mail', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fetch = await storeFetch()
    let cookie = ''
    const call = async (path: string, init: RequestInit = {}) => {
      const request = new Request(`${ORIGIN}${path}`, init)
      if (cookie !== '') request.headers.set('Cookie', cookie)
      const response = await fetch(request)
      const [pair = ''] = (response.headers.getSetCookie()[0] ?? '').split(';')
      if (pair !== '') cookie = pair
      return response
    }
    const csrf = async () =>
      ((await (await call('/auth/csrf')).json()) as { csrfToken: string }).csrfToken
    const post = async (path: string, body: unknown) =>
      call(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
        body: JSON.stringify(body),
      })

    await post('/auth/register', {
      email: 'log@ejemplo.com',
      firstName: 'Lucía',
      lastName: 'Pérez',
      password: 'mate-amargo-2026',
    })
    expect((await post('/auth/password/forgot', { email: 'log@ejemplo.com' })).status).toBe(202)

    const lines = stdout.mock.calls.map(([text]) => String(text))
    const notice = lines.find((line) => line.includes('Enlace para cambiar la contraseña'))
    expect(notice).toMatch(
      /^\[modo de prueba\] Enlace para cambiar la contraseña de log@ejemplo\.com \(vence .+\): http:\/\/localhost:3000\/cuenta\/restablecer\?token=rt_[0-9a-f]{64}\n$/,
    )
  })
})
