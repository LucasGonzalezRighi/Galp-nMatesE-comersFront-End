import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ADMIN_SECURITY_HEADERS, buildAdminCsp } from '../apps/admin/src/lib/csp.ts'

/** `apps/admin/vercel.json`: la configuración del proyecto del dashboard en Vercel. */
const config = JSON.parse(
  readFileSync(fileURLToPath(new URL('../apps/admin/vercel.json', import.meta.url)), 'utf8'),
)

/** Las cabeceras de la regla que cubre todas las rutas, como un objeto. */
function headersForEveryPath() {
  const rule = config.headers.find((item) => item.source === '/(.*)')
  return Object.fromEntries(rule.headers.map(({ key, value }) => [key, value]))
}

/** El proxy de la API: la única regla de `routes`. */
function apiRoute() {
  expect(config.routes).toHaveLength(1)
  return config.routes[0]
}

describe('apps/admin/vercel.json', () => {
  it('manda la misma CSP y las mismas cabeceras de seguridad que el código del dashboard', () => {
    // El dashboard le habla al back por su propio origen (el proxy de abajo): no hay otro origen
    // de API que permitir, así que la CSP es la de `buildAdminCsp(null)`.
    expect(headersForEveryPath()).toEqual({
      'Content-Security-Policy': buildAdminCsp(null),
      ...ADMIN_SECURITY_HEADERS,
    })
  })

  it('reenvía al back solo las rutas del admin, conservando el resto de la ruta', () => {
    const route = apiRoute()

    expect(route.src).toBe('/api/v1/admin/(.*)')
    expect(route.dest).toMatch(/^https:\/\/[a-z0-9.-]+\/api\/v1\/admin\/\$1$/)
  })

  it('le prueba al back que el pedido sale de este proyecto y de dónde tomar la IP del cliente', () => {
    const transforms = apiRoute().transforms

    expect(transforms).toContainEqual({
      type: 'request.headers',
      op: 'set',
      target: { key: 'x-galpon-proxy-secret' },
      args: '$API_PROXY_SECRET',
      env: ['API_PROXY_SECRET'],
    })
    expect(transforms).toContainEqual({
      type: 'request.headers',
      op: 'set',
      target: { key: 'x-galpon-client-ip-from' },
      args: 'x-forwarded-for',
    })
    // El visitante no puede elegir su propia IP: la cabecera explícita no pasa.
    expect(transforms).toContainEqual({
      type: 'request.headers',
      op: 'delete',
      target: { key: 'x-galpon-client-ip' },
    })
  })

  it('cualquier otra ruta que no sea un archivo ni la API devuelve index.html (es una SPA)', () => {
    expect(config.rewrites).toEqual([{ source: '/((?!api/).*)', destination: '/index.html' }])
    const spa = new RegExp(`^${config.rewrites[0].source}$`)
    expect(spa.test('/productos/nuevo')).toBe(true)
    expect(spa.test('/api/v1/admin/auth/me')).toBe(false)
  })

  it('los archivos con hash de /assets se guardan para siempre', () => {
    const rule = config.headers.find((item) => item.source === '/assets/(.*)')
    expect(rule.headers).toEqual([
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ])
  })
})
