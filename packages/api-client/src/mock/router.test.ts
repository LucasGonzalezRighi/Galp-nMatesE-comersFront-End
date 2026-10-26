import { describe, expect, it } from 'vitest'
import { createMockApi, MOCK_ORIGIN, rawRequest } from '../test/mock-api'
import { json } from './http'
import { matchRoute, route } from './router'

const ok = () => json({})

const ROUTES = [
  route('GET', '/products/{slug}', ok),
  route('GET', '/products/{slug}/reviews', ok),
  route('POST', '/products/{slug}/reviews', ok),
  route('PUT', '/admin/categories/order', ok),
  route('PATCH', '/admin/categories/{id}', ok),
  route('DELETE', '/admin/categories/{id}', ok),
]

describe('route', () => {
  it('rechaza un método que no es HTTP', () => {
    expect(() => route('TRACE' as never, '/categories', ok)).toThrow(RangeError)
  })
})

describe('matchRoute', () => {
  it('una ruta con más segmentos matchea con la suya y no con la del producto', () => {
    const match = matchRoute(ROUTES, 'GET', '/products/mate-imperial-premium/reviews')
    expect(match).toMatchObject({
      route: { method: 'GET', path: '/products/{slug}/reviews' },
      params: { slug: 'mate-imperial-premium' },
    })
  })

  it('elige la ruta del método pedido entre las que comparten forma', () => {
    expect(matchRoute(ROUTES, 'PUT', '/admin/categories/order')).toMatchObject({
      route: { path: '/admin/categories/order' },
      params: {},
    })
    expect(matchRoute(ROUTES, 'PATCH', '/admin/categories/order')).toMatchObject({
      route: { path: '/admin/categories/{id}' },
      params: { id: 'order' },
    })
  })

  it('distingue un método no permitido de una ruta desconocida', () => {
    expect(matchRoute(ROUTES, 'DELETE', '/products/mate-galleta')).toBe('method_not_allowed')
    expect(matchRoute(ROUTES, 'GET', '/nada')).toBeNull()
    expect(matchRoute(ROUTES, 'GET', '/products')).toBeNull()
    expect(matchRoute(ROUTES, 'GET', '/products/a/b/c')).toBeNull()
  })

  it('decodifica los parámetros y descarta los que están mal codificados', () => {
    expect(matchRoute(ROUTES, 'GET', '/products/caf%C3%A9')).toMatchObject({
      params: { slug: 'café' },
    })
    expect(matchRoute(ROUTES, 'GET', '/products/%E0%A4%A')).toBeNull()
  })

  it('acepta una barra final', () => {
    expect(matchRoute(ROUTES, 'GET', '/products/mate-galleta/')).toMatchObject({
      params: { slug: 'mate-galleta' },
    })
  })

  it('pide una ruta que empiece con barra', () => {
    expect(() => matchRoute(ROUTES, 'GET', 'products/mate-galleta')).toThrow(RangeError)
  })
})

describe('respuestas genéricas del router', () => {
  it('quita cualquiera de los dos prefijos de la API', async () => {
    const mock = createMockApi()
    const viaMock = await mock.fetch(new Request(`${MOCK_ORIGIN}/api/mock/v1/settings/public`))
    const viaRewrite = await mock.fetch(new Request(`${MOCK_ORIGIN}/api/v1/settings/public`))
    const outside = await mock.fetch(new Request(`${MOCK_ORIGIN}/otra/v1/settings/public`))
    expect(viaMock.status).toBe(200)
    expect(viaRewrite.status).toBe(200)
    expect(outside.status).toBe(404)
  })

  it('responde 404 con forma de problem a una ruta desconocida', async () => {
    const response = await rawRequest(createMockApi(), '/nada')
    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({
      type: 'not_found',
      title: 'No encontrado',
      status: 404,
    })
  })

  it('responde 405 con forma de problem a un método no permitido', async () => {
    const response = await rawRequest(createMockApi(), '/products', { method: 'DELETE' })
    expect(response.status).toBe(405)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({ type: 'method_not_allowed', status: 405 })
  })

  it('responde 501 con el plan en que llega una operación pendiente', async () => {
    const mock = createMockApi()
    const cases = [
      { path: '/webhooks/mercadopago', method: 'POST', plan: 'P3' },
      { path: '/admin/orders', method: 'GET', plan: 'P4' },
    ]
    for (const { path, method, plan } of cases) {
      const response = await rawRequest(
        mock,
        path,
        method === 'GET' ? { method } : { method, body: '{}' },
      )
      expect(response.status).toBe(501)
      expect(response.headers.get('Content-Type')).toBe('application/problem+json')
      expect(await response.json()).toEqual({
        type: 'not_implemented',
        title: 'No implementado en el modo de prueba',
        status: 501,
        detail: `Llega en ${plan}`,
      })
    }
  })
})
