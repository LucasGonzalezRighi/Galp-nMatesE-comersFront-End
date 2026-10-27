import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ApiClient, ApiFetch, Order } from '@galpon/api-client'
import type { MockDb } from '@galpon/api-client/mock'
import { createApiClient, createOrder, payWithCard } from '@galpon/api-client'
import {
  createMockCardToken,
  createMockDb,
  createMockFetch,
  DEFAULT_MOCK_DB_OPTIONS,
} from '@galpon/api-client/mock'
import { ApiClientProvider } from '@galpon/api-client/react'
import { readOrderToken, saveOrderSession } from '../../order-session'

/** Origen de la API en los tests. */
const API_BASE = 'http://localhost/api/v1'

/** Resumen del carrito que se guarda con el pedido de prueba. */
export const TEST_CART_HASH = '00000000c0ffee'

/** API simulada de un test del resultado, con el token del pedido de la pestaña. */
export interface ResultTestApi {
  /** Base simulada propia del test. */
  db: MockDb
  /** Pedidos que llegaron a la API, en orden. */
  requests: Request[]
  /** Cliente de la API, que manda `X-Order-Token` con el pedido guardado (como el del navegador). */
  api: ApiClient
  /** Cliente de TanStack Query del test. */
  queryClient: QueryClient
  /** `fetch` del navegador contra la API simulada (para las rutas internas del modo de prueba). */
  browserFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  /** Pone `children` dentro de los proveedores de la tienda. */
  wrap: (children: ReactNode) => ReactNode
}

/**
 * Arma una API simulada sin latencia. El reloj es el real (o el falso de `vi.useFakeTimers`).
 */
export function createResultTestApi(): ResultTestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const requests: Request[] = []
  const fetch: ApiFetch = (request) => {
    requests.push(request.clone())
    return mockFetch(request)
  }
  const api = createApiClient({ baseUrl: API_BASE, fetch, getOrderToken: readOrderToken })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    db,
    requests,
    api,
    queryClient,
    browserFetch: (input, init) =>
      fetch(
        new Request(
          new URL(input instanceof Request ? input.url : input, 'http://localhost'),
          init,
        ),
      ),
    wrap: (children) => (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={api}>{children}</ApiClientProvider>
      </QueryClientProvider>
    ),
  }
}

/**
 * Hace un pedido de invitado (Mate Imperial Premium con envío a domicilio, $46.499) y lo guarda
 * en la pestaña, como el checkout después del `201`.
 *
 * @param testApi - API del test.
 * @returns El pedido recién creado.
 */
export async function placeGuestOrder(testApi: ResultTestApi): Promise<Order> {
  const { order, orderToken } = await createOrder(
    testApi.api,
    {
      customer: {
        email: 'lucia@ejemplo.com',
        firstName: 'Lucía',
        lastName: 'Pérez',
        phone: '1123456789',
      },
      shipping: {
        method: 'home',
        address: {
          street: 'Av. Corrientes',
          number: '1234',
          apartment: null,
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
      paymentMethod: 'card',
      expectedTotalArs: 46499,
      website: null,
    },
    crypto.randomUUID(),
  )
  saveOrderSession({ number: order.number, orderToken, cartHash: TEST_CART_HASH })
  return order
}

/**
 * Paga el pedido con una tarjeta de prueba: el titular decide el resultado (`APRO`, `CONT`,
 * `FUND`, `3DS`…), como en el sandbox de Mercado Pago.
 *
 * @param testApi - API del test.
 * @param number - Número del pedido.
 * @param holder - Titular de prueba.
 */
export async function payWithTestCard(
  testApi: ResultTestApi,
  number: string,
  holder: string,
): Promise<void> {
  await payWithCard(
    testApi.api,
    number,
    {
      token: createMockCardToken({ cardholderName: holder, lastFour: '4242' }),
      paymentMethodId: 'visa',
      issuerId: null,
      installments: 1,
      payer: { email: 'lucia@ejemplo.com', identification: { type: 'DNI', number: '12345678' } },
    },
    crypto.randomUUID(),
  )
}

/**
 * Llama una ruta interna del modo de prueba (`/__mock/…`) con un cuerpo JSON.
 *
 * @param testApi - API del test.
 * @param path - Ruta relativa a `/api/v1`.
 * @param body - Cuerpo del pedido.
 */
export async function postMock(
  testApi: ResultTestApi,
  path: string,
  body: unknown = {},
): Promise<Response> {
  return testApi.browserFetch(`/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Pedidos `GET /orders/{number}` que llegaron a la API. */
export function orderReads(testApi: ResultTestApi): Request[] {
  return testApi.requests.filter(
    (request) => request.method === 'GET' && /\/orders\/GLP-\d{5}$/.test(request.url),
  )
}
