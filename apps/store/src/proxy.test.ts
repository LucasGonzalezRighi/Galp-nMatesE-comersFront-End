import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { config, proxy } from './proxy'

/** Modo de la API simulado: cada prueba lo cambia antes de llamar al proxy. */
const env = vi.hoisted(() => ({ apiMode: 'mock' }))

vi.mock('./lib/env', () => ({ getStoreEnv: () => ({ apiMode: env.apiMode }) }))

beforeEach(() => {
  env.apiMode = 'mock'
})

/** Pedido a la tienda, con las cookies indicadas. */
function requestTo(path: string, cookie?: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000${path}`,
    cookie === undefined ? undefined : { headers: { cookie } },
  )
}

describe('proxy', () => {
  it('no importa el barrel del modo de prueba: en vivo traería los fixtures y los handlers al chunk', () => {
    const source = readFileSync(fileURLToPath(new URL('./proxy.ts', import.meta.url)), 'utf8')
    const packages = Array.from(source.matchAll(/from\s+'(@galpon\/[^']+)'/g), (match) => match[1])

    expect(packages).not.toContain('@galpon/api-client/mock')
    expect(packages).toContain('@galpon/api-client/mock/session-cookie')
  })

  it('sin cookie de sesión manda a ingresar con `volver`', () => {
    const response = proxy(requestTo('/cuenta/pedidos?pagina=2'))

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get('location') ?? '')
    expect(location.pathname).toBe('/cuenta/ingresar')
    expect(location.searchParams.get('volver')).toBe('/cuenta/pedidos?pagina=2')
  })

  it('con la cookie de sesión del modo de prueba deja pasar', () => {
    const response = proxy(requestTo('/cuenta', 'galpon_session=abc'))

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('location')).toBeNull()
  })

  it('en vivo lee la cookie `__Host-galpon_session`', () => {
    env.apiMode = 'live'

    expect(proxy(requestTo('/cuenta/direcciones', 'galpon_session=abc')).status).toBe(307)
    expect(
      proxy(requestTo('/cuenta/direcciones', '__Host-galpon_session=abc')).headers.get(
        'x-middleware-next',
      ),
    ).toBe('1')
  })

  it('una cookie vacía no cuenta como sesión', () => {
    expect(proxy(requestTo('/cuenta/pedidos/GLP-12345', 'galpon_session=')).status).toBe(307)
  })

  it.each(['/cuenta/ingresar', '/cuenta/registro', '/cuenta/recuperar', '/cuenta/restablecer'])(
    'deja pasar %s sin sesión',
    (path) => {
      expect(proxy(requestTo(`${path}?token=RESET-OK`)).headers.get('x-middleware-next')).toBe('1')
    },
  )

  it('solo corre en /cuenta', () => {
    expect(config.matcher).toEqual(['/cuenta', '/cuenta/:path*'])
  })
})
