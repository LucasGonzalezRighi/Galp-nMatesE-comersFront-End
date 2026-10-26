import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiFetch } from '@galpon/api-client'
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { ApiClientProvider } from '@galpon/api-client/react'

/** API simulada de un test del buscador: los pedidos que recibió y un envoltorio con los proveedores. */
export interface SearchTestApi {
  /** Pedidos que llegaron a la API, en orden. */
  requests: Request[]
  /** Pone `children` dentro de los proveedores de la tienda (cliente de la API y TanStack Query). */
  wrap: (children: ReactNode) => ReactNode
}

/**
 * Arma una API simulada sin latencia para un test: la base real del modo de prueba, o el `fetch`
 * que se pase (por ejemplo, uno que falla como la red).
 *
 * @param fetchOverride - Reemplaza al `fetch` simulado.
 */
export function createSearchTestApi(fetchOverride?: ApiFetch): SearchTestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const requests: Request[] = []
  const fetch: ApiFetch = (request) => {
    requests.push(request.clone())
    return (fetchOverride ?? mockFetch)(request)
  }
  const client = createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    requests,
    wrap: (children) => (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    ),
  }
}

/** `fetch` que falla como cuando no hay conexión. */
export function offlineFetch(): Promise<Response> {
  return Promise.reject(new TypeError('Failed to fetch'))
}
