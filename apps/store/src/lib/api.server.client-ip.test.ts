import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMe } from '@galpon/api-client'
import { getServerApiForRequest } from './api.server'

vi.mock('server-only', () => ({}))
// En vivo no se usa la API simulada: así el test no carga su base ni `next/cache`.
vi.mock('./mock.server', () => ({ getStoreMockFetch: vi.fn() }))

/** Entorno en vivo; cada prueba elige la cabecera de confianza (`TRUSTED_CLIENT_IP_HEADER`). */
const env = vi.hoisted(() => ({
  apiMode: 'live',
  apiBaseUrl: 'https://api.example.test',
  trustedClientIpHeader: null as string | null,
}))

vi.mock('./env', () => ({ getStoreEnv: () => env }))

/** Pedidos que el servidor de la tienda le manda al backend. */
let sent: Request[] = []

beforeEach(() => {
  env.trustedClientIpHeader = null
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
