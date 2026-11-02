import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiClient, ApiFetch, CreateOrderResult, RegisterInput } from '@galpon/api-client'
import type { MockDb } from '@galpon/api-client/mock'
import { createApiClient, createOrder, register } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { ApiClientProvider } from '@galpon/api-client/react'
import { readCsrfToken, resetAccountState, withCsrf } from '../csrf'

/** API simulada de un test de la cuenta, con cookies propias como un navegador. */
export interface AccountTestApi {
  /** Base simulada propia del test. */
  db: MockDb
  /** Cookies guardadas, por nombre. */
  cookies: Map<string, string>
  /** Pedidos que llegaron a la API, en orden. */
  requests: Request[]
  /** Cliente de la API, que manda el token CSRF guardado por la feature (como el del navegador). */
  api: ApiClient
  /** Cliente de TanStack Query del test. */
  queryClient: QueryClient
  /** Pone `children` dentro de los proveedores de la tienda. */
  wrap: (children: ReactNode) => ReactNode
}

/**
 * Arma una API simulada sin latencia, con un frasco de cookies: guarda las `Set-Cookie` y las
 * manda en los pedidos siguientes, así la sesión se abre y se cierra como en el navegador.
 *
 * @param fetchOverride - Atiende los pedidos en lugar de la API simulada (por ejemplo, sin red).
 */
export function createAccountTestApi(fetchOverride?: ApiFetch): AccountTestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const cookies = new Map<string, string>()
  const requests: Request[] = []
  const fetch: ApiFetch = async (request) => {
    if (cookies.size > 0) {
      request.headers.set(
        'Cookie',
        [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      )
    }
    requests.push(request.clone())
    const response = await (fetchOverride ?? mockFetch)(request)
    for (const header of response.headers.getSetCookie()) {
      const [pair = ''] = header.split(';')
      const [name = '', value = ''] = pair.split('=')
      if (/max-age=0/i.test(header)) cookies.delete(name)
      else cookies.set(name, value)
    }
    return response
  }
  const api = createApiClient({
    baseUrl: 'http://localhost/api/v1',
    fetch,
    getCsrfToken: readCsrfToken,
  })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    db,
    cookies,
    requests,
    api,
    queryClient,
    wrap: (children) => (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={api}>{children}</ApiClientProvider>
      </QueryClientProvider>
    ),
  }
}

/** Cliente de prueba: Lucía Pérez. */
export const LUCIA: RegisterInput = {
  email: 'lucia@ejemplo.com',
  firstName: 'Lucía',
  lastName: 'Pérez',
  password: 'mate-amargo-2026',
}

/**
 * Crea la cuenta e inicia la sesión, como lo hace el formulario de registro.
 *
 * @param testApi - API del test.
 * @param input - Datos de la cuenta; por omisión los de {@link LUCIA}.
 */
export async function signUp(testApi: AccountTestApi, input: RegisterInput = LUCIA): Promise<void> {
  await withCsrf(testApi.queryClient, testApi.api, () => register(testApi.api, input))
  await resetAccountState(testApi.queryClient)
}

/**
 * Compra un Mate Imperial Premium con envío a domicilio ($39.999 + $6.500), con la sesión que
 * tenga la API del test (sin sesión es un pedido de invitado).
 *
 * @param api - Cliente de la API.
 * @param email - Email del contacto del pedido.
 */
export function placeOrder(api: ApiClient, email = LUCIA.email): Promise<CreateOrderResult> {
  return createOrder(
    api,
    {
      customer: { email, firstName: 'Lucía', lastName: 'Pérez', phone: '1123456789' },
      shipping: {
        method: 'home',
        address: {
          street: 'Av. Corrientes',
          number: '1234',
          apartment: '5° B',
          postalCode: 'C1043',
          city: 'CABA',
          province: 'CABA',
        },
      },
      items: [
        {
          type: 'product',
          productId: 'prd-imperial-premium',
          quantity: 1,
          options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
        },
      ],
      paymentMethod: 'mp_redirect',
      expectedTotalArs: 46499,
      website: null,
    },
    crypto.randomUUID(),
  )
}

/** `fetch` que falla como cuando no hay conexión. */
export function offlineFetch(): Promise<Response> {
  return Promise.reject(new TypeError('Failed to fetch'))
}
