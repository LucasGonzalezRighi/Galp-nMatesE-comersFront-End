import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { ApiError, isApiError } from './errors'
import { adminLogout, listCategories } from './services'
import { createFakeFetch, jsonResponse, problemResponse } from './test/fake-fetch'
import { unwrap, unwrapVoid } from './unwrap'

const BASE_URL = 'http://x/api/v1'

describe('createApiClient', () => {
  it('pide GET a baseUrl + ruta y manda Accept: application/json', async () => {
    const { fetch, requests } = createFakeFetch(() => jsonResponse([]))
    const api = createApiClient({ baseUrl: BASE_URL, fetch })
    await listCategories(api)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.method).toBe('GET')
    expect(requests[0]?.url).toBe('http://x/api/v1/categories')
    expect(requests[0]?.headers.get('Accept')).toBe('application/json')
  })

  it('manda X-CSRF-Token en lo que no es GET/HEAD', async () => {
    const { fetch, requests } = createFakeFetch(() => new Response(null, { status: 204 }))
    const api = createApiClient({ baseUrl: BASE_URL, fetch, getCsrfToken: () => 'tok' })
    await adminLogout(api)
    expect(requests[0]?.method).toBe('POST')
    expect(requests[0]?.headers.get('X-CSRF-Token')).toBe('tok')
  })

  it('no manda X-CSRF-Token en un GET aunque haya token', async () => {
    const { fetch, requests } = createFakeFetch(() => jsonResponse([]))
    const api = createApiClient({ baseUrl: BASE_URL, fetch, getCsrfToken: () => 'tok' })
    await listCategories(api)
    expect(requests[0]?.headers.has('X-CSRF-Token')).toBe(false)
  })

  it.each([
    ['sin getCsrfToken', undefined],
    ['con un token undefined', () => undefined],
    ['con un token vacío', () => ''],
  ])('no manda X-CSRF-Token %s', async (_caso, getCsrfToken) => {
    const { fetch, requests } = createFakeFetch(() => new Response(null, { status: 204 }))
    const api = createApiClient({ baseUrl: BASE_URL, fetch, getCsrfToken })
    await adminLogout(api)
    expect(requests[0]?.headers.has('X-CSRF-Token')).toBe(false)
  })

  it('lee el token en cada pedido', async () => {
    let token = 'primero'
    const { fetch, requests } = createFakeFetch(() => new Response(null, { status: 204 }))
    const api = createApiClient({ baseUrl: BASE_URL, fetch, getCsrfToken: () => token })
    await adminLogout(api)
    token = 'segundo'
    await adminLogout(api)
    expect(requests.map((request) => request.headers.get('X-CSRF-Token'))).toEqual([
      'primero',
      'segundo',
    ])
  })

  it('sin fetch propio usa el fetch global', async () => {
    const { fetch, requests } = createFakeFetch(() => jsonResponse([]))
    vi.stubGlobal('fetch', (request: Request) => fetch(request))
    try {
      await listCategories(createApiClient({ baseUrl: BASE_URL }))
    } finally {
      vi.unstubAllGlobals()
    }
    expect(requests).toHaveLength(1)
  })

  it('pasa credentials a cada pedido', async () => {
    const { fetch, requests } = createFakeFetch(() => jsonResponse([]))
    const api = createApiClient({ baseUrl: BASE_URL, fetch, credentials: 'include' })
    await listCategories(api)
    expect(requests[0]?.credentials).toBe('include')
  })

  it.each([[''], ['   '], ['/api/v1'], ['localhost:4000/api/v1'], ['ftp://x/api/v1']])(
    'rechaza un baseUrl que no es una URL http(s) absoluta (%j)',
    (baseUrl) => {
      expect(() => createApiClient({ baseUrl })).toThrow(RangeError)
    },
  )

  it('un fetch que rechaza termina en un ApiError "network"', async () => {
    const cause = new TypeError('fetch failed')
    const api = createApiClient({ baseUrl: BASE_URL, fetch: () => Promise.reject(cause) })
    const error = await listCategories(api).catch((caught: unknown) => caught)
    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({ kind: 'network', status: null, cause })
  })

  it('una respuesta de error termina en un ApiError con el problema', async () => {
    const problem = { type: 'not_found', title: 'No existe', status: 404 }
    const { fetch } = createFakeFetch(() => problemResponse(404, problem))
    const api = createApiClient({ baseUrl: BASE_URL, fetch })
    const error = await listCategories(api).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ kind: 'not_found', status: 404, problem })
  })
})

describe('unwrap', () => {
  it('devuelve los datos de una respuesta exitosa', async () => {
    const response = new Response(null, { status: 200 })
    await expect(unwrap(Promise.resolve({ data: { id: 1 }, response }))).resolves.toEqual({ id: 1 })
  })

  it('convierte un error HTTP en ApiError', async () => {
    const response = new Response(null, { status: 409 })
    const error = await unwrap(Promise.resolve({ error: 'x', response })).catch(
      (caught: unknown) => caught,
    )
    expect(error).toMatchObject({ kind: 'conflict', status: 409 })
  })

  it('convierte un TypeError (falla de red) en ApiError "network" y deja pasar un ApiError', async () => {
    const cause = new TypeError('fetch failed')
    const network = await unwrap(Promise.reject(cause)).catch((caught: unknown) => caught)
    expect(network).toMatchObject({ kind: 'network', status: null, cause })
    const original = new ApiError({ kind: 'server', status: 500, problem: null, message: 'x' })
    await expect(unwrap(Promise.reject(original))).rejects.toBe(original)
  })

  it.each([
    ['un SyntaxError, como el de un 2xx que no es JSON', new SyntaxError('Unexpected token <')],
    ['un Error cualquiera', new Error('boom')],
  ])('convierte %s en ApiError "server" y no en "network"', async (_description, cause) => {
    const error = await unwrap(Promise.reject(cause)).catch((caught: unknown) => caught)
    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({
      kind: 'server',
      status: null,
      cause,
      message: 'Hubo un problema en el servidor. Probá de nuevo en unos minutos.',
    })
  })

  it('un 2xx que no es JSON, leído por openapi-fetch, termina en ApiError "server"', async () => {
    const { fetch } = createFakeFetch(
      () => new Response('<html>no soy JSON</html>', { status: 200 }),
    )
    const api = createApiClient({ baseUrl: BASE_URL, fetch })
    const error = await listCategories(api).catch((caught: unknown) => caught)
    expect(error).toMatchObject({ kind: 'server' })
  })

  it('falla si la respuesta es exitosa pero no trae cuerpo', async () => {
    const response = new Response(null, { status: 200 })
    await expect(unwrap(Promise.resolve({ response }))).rejects.toMatchObject({
      kind: 'server',
      status: 200,
      message: 'La API respondió sin contenido.',
    })
  })
})

describe('unwrapVoid', () => {
  it('resuelve undefined con una respuesta exitosa', async () => {
    const response = new Response(null, { status: 204 })
    await expect(unwrapVoid(Promise.resolve({ response }))).resolves.toBeUndefined()
  })

  it('convierte un error HTTP o un throw en ApiError', async () => {
    const response = new Response(null, { status: 401 })
    await expect(unwrapVoid(Promise.resolve({ error: undefined, response }))).rejects.toMatchObject(
      { kind: 'unauthorized' },
    )
    await expect(unwrapVoid(Promise.reject(new TypeError('boom')))).rejects.toMatchObject({
      kind: 'network',
    })
    await expect(unwrapVoid(Promise.reject(new SyntaxError('boom')))).rejects.toMatchObject({
      kind: 'server',
    })
  })
})
