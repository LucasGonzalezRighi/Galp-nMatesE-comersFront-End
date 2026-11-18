import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe, listCategories } from '@galpon/api-client'
import { getServerApi, getServerApiForRequest } from './api.server'

vi.mock('server-only', () => ({}))
// En vivo no se usa la API simulada: así el test no carga su base ni `next/cache`.
vi.mock('./mock.server', () => ({ getStoreMockFetch: vi.fn() }))

/**
 * Entorno en vivo; cada prueba elige la cabecera de confianza (`TRUSTED_CLIENT_IP_HEADER`) y el
 * secreto del proxy (`API_PROXY_SECRET`).
 */
const env = vi.hoisted(() => ({
  apiMode: 'live',
  apiBaseUrl: 'https://api.example.test',
  trustedClientIpHeader: null as string | null,
  apiProxySecret: null as string | null,
}))

vi.mock('./env', () => ({ getStoreEnv: () => env }))

/** Pedidos que el servidor de la tienda le manda al backend. */
let sent: Request[] = []

beforeEach(() => {
  env.trustedClientIpHeader = null
  env.apiProxySecret = null
  sent = []
  vi.stubGlobal('fetch', (request: Request) => {
    sent.push(request)
    return Promise.resolve(
      Response.json({ email: 'ana@ejemplo.com', firstName: 'Ana', lastName: 'Gil', phone: null }),
    )
  })
})

/** Cookies del pedido entrante, con la forma de las que entrega `cookies()` de Next. */
function incomingCookies(values: Record<string, string>): {
  getAll: () => { name: string; value: string }[]
} {
  return { getAll: () => Object.entries(values).map(([name, value]) => ({ name, value })) }
}

/** Cabeceras que puede inventar el navegador: nunca llegan al backend. */
const SPOOFED = {
  'x-forwarded-for': '203.0.113.7',
  'x-real-ip': '203.0.113.9',
  forwarded: 'for=203.0.113.8',
}

/** Lo que recibió el backend en la única lectura del test. */
async function readMe(headers: Headers): Promise<Request> {
  const api = getServerApiForRequest(incomingCookies({ '__Host-galpon_session': 'abc' }), headers)
  await getMe(api)
  expect(sent).toHaveLength(1)
  const [request] = sent
  if (request === undefined) throw new Error('El servidor no le mandó nada al backend.')
  return request
}

describe('getServerApiForRequest: la IP del cliente para los límites del backend', () => {
  it('con TRUSTED_CLIENT_IP_HEADER manda X-Forwarded-For con la IP del proxy de la plataforma, no la del navegador', async () => {
    env.trustedClientIpHeader = 'cf-connecting-ip'

    const request = await readMe(new Headers({ ...SPOOFED, 'cf-connecting-ip': ' 198.51.100.4 ' }))

    expect(request.url).toBe('https://api.example.test/api/v1/me')
    expect(request.headers.get('x-forwarded-for')).toBe('198.51.100.4')
    expect(request.headers.get('x-real-ip')).toBeNull()
    expect(request.headers.get('forwarded')).toBeNull()
    expect(request.headers.get('cookie')).toBe('__Host-galpon_session=abc')
  })

  it('sin TRUSTED_CLIENT_IP_HEADER no manda ninguna IP, aunque el navegador mande la suya', async () => {
    const request = await readMe(new Headers({ ...SPOOFED, 'cf-connecting-ip': '198.51.100.4' }))

    expect(request.headers.get('x-forwarded-for')).toBeNull()
    expect(request.headers.get('x-real-ip')).toBeNull()
  })

  it('si el pedido no trae la cabecera de confianza, no manda X-Forwarded-For', async () => {
    env.trustedClientIpHeader = 'cf-connecting-ip'

    const request = await readMe(new Headers(SPOOFED))

    expect(request.headers.get('x-forwarded-for')).toBeNull()
  })
})

describe('getServerApiForRequest con API_PROXY_SECRET (Vercel y Render)', () => {
  const SECRET = 's'.repeat(40)

  it('manda el secreto y la IP real en x-galpon-client-ip', async () => {
    env.trustedClientIpHeader = 'x-real-ip'
    env.apiProxySecret = SECRET

    const request = await readMe(new Headers({ 'x-real-ip': '198.51.100.4' }))

    expect(request.headers.get('x-galpon-proxy-secret')).toBe(SECRET)
    expect(request.headers.get('x-galpon-client-ip')).toBe('198.51.100.4')
  })

  it('sin la IP del cliente manda el secreto solo', async () => {
    env.apiProxySecret = SECRET

    const request = await readMe(new Headers({ 'x-galpon-client-ip': '203.0.113.7' }))

    expect(request.headers.get('x-galpon-proxy-secret')).toBe(SECRET)
    expect(request.headers.get('x-galpon-client-ip')).toBeNull()
  })

  it('sin API_PROXY_SECRET no manda ninguna de las dos cabeceras', async () => {
    env.trustedClientIpHeader = 'x-real-ip'

    const request = await readMe(new Headers({ 'x-real-ip': '198.51.100.4' }))

    expect(request.headers.get('x-galpon-proxy-secret')).toBeNull()
    expect(request.headers.get('x-galpon-client-ip')).toBeNull()
  })
})

describe('getServerApi con API_PROXY_SECRET', () => {
  it('las lecturas propias de la tienda mandan el secreto sin ninguna IP de cliente', async () => {
    env.apiProxySecret = 's'.repeat(40)
    vi.stubGlobal('fetch', (request: Request) => {
      sent.push(request)
      return Promise.resolve(Response.json([]))
    })

    await listCategories(getServerApi())

    const [request] = sent
    expect(request?.url).toBe('https://api.example.test/api/v1/categories')
    expect(request?.headers.get('x-galpon-proxy-secret')).toBe('s'.repeat(40))
    expect(request?.headers.get('x-galpon-client-ip')).toBeNull()
    expect(request?.headers.get('x-forwarded-for')).toBeNull()
  })
})
