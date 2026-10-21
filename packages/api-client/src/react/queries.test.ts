import type { ReactNode } from 'react'
// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from '../client'
import { createApiClient } from '../client'
import { ApiError } from '../errors'
import { createFakeFetch, jsonResponse } from '../test/fake-fetch'
import { ApiClientProvider, useApiClient } from './ApiClientProvider'
import {
  adminCsrfQuery,
  adminProductsQuery,
  adminSessionQuery,
  publicSettingsQuery,
  shouldRetryQuery,
} from './queries'
import { queryKeys } from './query-keys'

function setup() {
  const { fetch, requests } = createFakeFetch(() => jsonResponse({ marker: 'respuesta' }))
  const api = createApiClient({ baseUrl: 'http://x/api/v1', fetch })
  return { api, requests }
}

describe('useApiClient', () => {
  it('sin ApiClientProvider falla con un mensaje claro', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      expect(() => renderHook(() => useApiClient())).toThrow(
        'useApiClient necesita <ApiClientProvider>',
      )
    } finally {
      consoleError.mockRestore()
    }
  })

  it('con ApiClientProvider devuelve el cliente que se le dio', () => {
    const { api } = setup()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ApiClientProvider, { client: api, children })
    const { result } = renderHook(() => useApiClient(), { wrapper })
    expect(result.current).toBe(api)
  })
})

describe('queryKeys', () => {
  it('arma claves estables', () => {
    expect(queryKeys.categories()).toEqual(['categories'])
    expect(queryKeys.publicSettings()).toEqual(['settings', 'public'])
    expect(queryKeys.adminSession()).toEqual(['admin', 'session'])
    expect(queryKeys.adminCsrf()).toEqual(['admin', 'csrf'])
    expect(queryKeys.adminProducts({ status: 'draft', page: 2 })).toEqual([
      'admin',
      'products',
      { status: 'draft', page: 2 },
    ])
  })
})

describe('queryOptions', () => {
  it('publicSettingsQuery(api).queryKey es igual a queryKeys.publicSettings()', () => {
    const { api } = setup()
    expect(publicSettingsQuery(api).queryKey).toEqual(queryKeys.publicSettings())
  })

  it('cada consulta usa su clave', () => {
    const { api } = setup()
    expect(adminSessionQuery(api).queryKey).toEqual(queryKeys.adminSession())
    expect(adminCsrfQuery(api).queryKey).toEqual(queryKeys.adminCsrf())
    expect(adminProductsQuery(api, { q: 'bombillon' }).queryKey).toEqual(
      queryKeys.adminProducts({ q: 'bombillon' }),
    )
  })

  it.each<[string, (client: QueryClient, api: ApiClient) => Promise<unknown>, string]>([
    [
      'publicSettingsQuery',
      (client, api) => client.query(publicSettingsQuery(api)),
      '/settings/public',
    ],
    ['adminSessionQuery', (client, api) => client.query(adminSessionQuery(api)), '/admin/auth/me'],
    ['adminCsrfQuery', (client, api) => client.query(adminCsrfQuery(api)), '/admin/auth/csrf'],
    [
      'adminProductsQuery',
      (client, api) => client.query(adminProductsQuery(api, { page: 2 })),
      '/admin/products',
    ],
  ])('%s trae los datos de %s', async (_name, run, path) => {
    const { api, requests } = setup()
    await expect(run(new QueryClient(), api)).resolves.toEqual({ marker: 'respuesta' })
    expect(requests).toHaveLength(1)
    expect(new URL(requests[0]?.url ?? '').pathname).toBe(`/api/v1${path}`)
  })
})

describe('shouldRetryQuery', () => {
  const apiError = (kind: ApiError['kind']) =>
    new ApiError({ kind, status: null, problem: null, message: 'x' })

  it('reintenta hasta dos veces los errores de servidor y de red', () => {
    for (const kind of ['server', 'network'] as const) {
      expect(shouldRetryQuery(0, apiError(kind))).toBe(true)
      expect(shouldRetryQuery(1, apiError(kind))).toBe(true)
      expect(shouldRetryQuery(2, apiError(kind))).toBe(false)
    }
  })

  it('no reintenta una respuesta que ya es definitiva', () => {
    for (const kind of [
      'validation',
      'not_found',
      'conflict',
      'unauthorized',
      'forbidden',
      'rate_limited',
    ] as const) {
      expect(shouldRetryQuery(0, apiError(kind))).toBe(false)
    }
  })

  it('no reintenta un error que no viene de la API', () => {
    expect(shouldRetryQuery(0, new Error('bug'))).toBe(false)
  })
})
