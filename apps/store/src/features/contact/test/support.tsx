import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiFetch } from '@galpon/api-client'
import type { MockDb } from '@galpon/api-client/mock'
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { ApiClientProvider } from '@galpon/api-client/react'

/** API simulada de un test: su base, los pedidos que recibió y un envoltorio con los proveedores. */
export interface TestApi {
  /** Base simulada propia del test. */
  db: MockDb
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
export function createTestApi(fetchOverride?: ApiFetch): TestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const requests: Request[] = []
  const fetch: ApiFetch = (request) => {
    requests.push(request.clone())
    return (fetchOverride ?? mockFetch)(request)
  }
  const client = createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch })
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return {
    db,
    requests,
    wrap: (children) => (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    ),
  }
}

/** Respuesta `application/problem+json` de un error 422 con el mensaje de un campo. */
export function validationProblem(field: string, message: string): Response {
  return new Response(
    JSON.stringify({
      type: 'validation_error',
      title: 'Datos inválidos',
      status: 422,
      errors: [{ field, code: 'invalid', message }],
    }),
    { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

/** `fetch` que falla como cuando no hay conexión. */
export function offlineFetch(): Promise<Response> {
  return Promise.reject(new TypeError('Failed to fetch'))
}
