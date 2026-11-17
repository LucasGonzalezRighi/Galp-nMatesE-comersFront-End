import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isSlugShaped } from './lib/slug'
import { config, NOT_FOUND_SLUG, proxy } from './proxy'

/** Modo de la API y cabecera de la IP del cliente simulados: cada prueba los cambia. */
const env = vi.hoisted(() => ({
  apiMode: 'mock',
  trustedClientIpHeader: null as string | null,
}))

vi.mock('./lib/env', () => ({
  getStoreEnv: () => ({ apiMode: env.apiMode, trustedClientIpHeader: env.trustedClientIpHeader }),
}))

beforeEach(() => {
  env.apiMode = 'mock'
  env.trustedClientIpHeader = null
})

/** Pedido a la tienda, con las cookies indicadas. */
function requestTo(path: string, cookie?: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000${path}`,
    cookie === undefined ? undefined : { headers: { cookie } },
  )
}

/** Pedido a la tienda con las cabeceras indicadas. */
function requestWith(path: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers })
}

/** Cabeceras con las que sigue el pedido después del proxy (las que reemplaza `NextResponse.next`). */
function forwardedHeaders(response: Response): Map<string, string> {
  const names = response.headers.get('x-middleware-override-headers')
  if (names === null) throw new Error('El proxy no reemplazó las cabeceras del pedido.')
  return new Map(
    names
      .split(',')
      .filter((name) => name !== '')
      .map((name) => [name, response.headers.get(`x-middleware-request-${name}`) ?? '']),
  )
}

/** A dónde reescribe el proxy el pedido, o `null` si no lo reescribe. */
function rewrittenTo(response: Response): string | null {
  const target = response.headers.get('x-middleware-rewrite')
  return target === null ? null : new URL(target).pathname
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

  it('las páginas de la cuenta salen con Cache-Control: no-store (ni caché ni bfcache)', () => {
    expect(proxy(requestTo('/cuenta')).headers.get('cache-control')).toBe('no-store')
    expect(proxy(requestTo('/cuenta', 'galpon_session=abc')).headers.get('cache-control')).toBe(
      'no-store',
    )
    expect(proxy(requestTo('/cuenta/ingresar')).headers.get('cache-control')).toBe('no-store')
  })

  it('corre en /cuenta, en la API y en las fichas y líneas', () => {
    expect(config.matcher).toEqual([
      '/cuenta',
      '/cuenta/:path*',
      '/api/v1/:path*',
      '/producto/:slug',
      '/tienda/:linea',
    ])
  })
})

describe('proxy de /api/v1', () => {
  const spoofed = {
    'x-forwarded-for': '203.0.113.7',
    'x-real-ip': '203.0.113.9',
    forwarded: 'for=203.0.113.8',
    cookie: 'galpon_session=abc',
  }

  it('borra las cabeceras de reenvío que manda el cliente y no inventa otra', () => {
    const headers = forwardedHeaders(proxy(requestWith('/api/v1/auth/login', spoofed)))

    expect(headers.has('x-forwarded-for')).toBe(false)
    expect(headers.has('x-real-ip')).toBe(false)
    expect(headers.has('forwarded')).toBe(false)
    expect(headers.get('cookie')).toBe('galpon_session=abc')
  })

  it('con TRUSTED_CLIENT_IP_HEADER pone x-forwarded-for con lo que escribió el proxy de la plataforma', () => {
    env.trustedClientIpHeader = 'cf-connecting-ip'
    const headers = forwardedHeaders(
      proxy(requestWith('/api/v1/orders', { ...spoofed, 'cf-connecting-ip': ' 198.51.100.4 ' })),
    )

    expect(headers.get('x-forwarded-for')).toBe('198.51.100.4')
    expect(headers.has('x-real-ip')).toBe(false)
    expect(headers.has('forwarded')).toBe(false)
  })

  it('la cabecera de confianza puede ser una de las que se borran (x-real-ip)', () => {
    env.trustedClientIpHeader = 'x-real-ip'
    const headers = forwardedHeaders(proxy(requestWith('/api/v1/orders', spoofed)))

    expect(headers.get('x-forwarded-for')).toBe('203.0.113.9')
    expect(headers.has('x-real-ip')).toBe(false)
  })

  it('también en /api/v1 a secas, sin pasar por la guarda de la cuenta', () => {
    const response = proxy(requestWith('/api/v1', spoofed))

    expect(response.headers.get('location')).toBeNull()
    expect(forwardedHeaders(response).has('x-forwarded-for')).toBe(false)
  })

  it('si falta la cabecera de confianza, sigue sin x-forwarded-for', () => {
    env.trustedClientIpHeader = 'cf-connecting-ip'
    const headers = forwardedHeaders(proxy(requestWith('/api/v1/products', spoofed)))

    expect(headers.has('x-forwarded-for')).toBe(false)
  })
})

describe('proxy de /producto y /tienda', () => {
  it.each(['/producto/mate-imperial-premium', '/tienda/imperiales'])(
    'un slug con forma de slug sigue a la página: %s',
    (path) => {
      const response = proxy(requestTo(path))

      expect(response.headers.get('x-middleware-next')).toBe('1')
      expect(rewrittenTo(response)).toBeNull()
    },
  )

  it.each([
    ['/producto/Mate-Imperial', '/producto/_'],
    ['/producto/mate%20imperial', '/producto/_'],
    ['/producto/mate_imperial', '/producto/_'],
    ['/producto/..%2F..', '/producto/_'],
    [`/producto/${'a'.repeat(81)}`, '/producto/_'],
    ['/tienda/_', '/tienda/_'],
    ['/tienda/Imperiales', '/tienda/_'],
    [`/tienda/${'b'.repeat(81)}`, '/tienda/_'],
  ])(
    'un slug con otra forma va siempre a la misma 404 de su sección, sin generar una página por dirección: %s',
    (path, target) => {
      expect(rewrittenTo(proxy(requestTo(path)))).toBe(target)
    },
  )

  it('el slug de la 404 nunca es el de un producto ni el de una línea', () => {
    expect(NOT_FOUND_SLUG).toBe('_')
    expect(isSlugShaped(NOT_FOUND_SLUG)).toBe(false)
  })
})
