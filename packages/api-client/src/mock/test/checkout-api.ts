import type { ApiClient, ApiFetch } from '../../client'
import type { CreateOrderInput, CreateOrderResult } from '../../generated/schema'
import type { MockDb } from '../types'
import { createApiClient } from '../../client'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from '../db'
import { createMockFetch } from '../mock-fetch'
import { randomUuid } from '../uuid'

/** Origen con el que los tests hablan con la API simulada. */
export const ORIGIN = 'http://localhost'

/** Momento en que arrancan los tests de pedidos (el reloj se adelanta con `advance`). */
export const START = new Date('2026-10-26T15:00:00Z')

/** API simulada con cookies, token del pedido, token CSRF y reloj propios. */
export interface CheckoutApi {
  /** Cliente tipado que manda las cookies, el token CSRF y el token del pedido. */
  api: ApiClient
  /** Base simulada del test. */
  db: MockDb
  /** El `fetch` con las cookies, para pedidos crudos. */
  fetch: ApiFetch
  /** Cookies guardadas, por nombre. */
  cookies: Map<string, string>
  /** Adelanta el reloj de la API. */
  advance(minutes: number): void
  /** Cambia el token del pedido que manda el cliente. */
  setOrderToken(token: string | undefined): void
  /** Cambia el token CSRF que manda el cliente. */
  setCsrfToken(token: string | undefined): void
  /** Manda un pedido crudo, con la ruta relativa a `/api/v1`. */
  raw(path: string, init?: RequestInit): Promise<Response>
}

/** Crea una base nueva y un cliente con un frasco de cookies, sin latencia. */
export function createCheckoutApi(): CheckoutApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  let now = START
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0, now: () => now })
  const cookies = new Map<string, string>()
  const fetch: ApiFetch = async (request) => {
    if (cookies.size > 0) {
      request.headers.set(
        'Cookie',
        [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      )
    }
    const response = await mockFetch(request)
    for (const header of response.headers.getSetCookie()) {
      const [pair = ''] = header.split(';')
      const [name = '', value = ''] = pair.split('=')
      if (/max-age=0/i.test(header)) cookies.delete(name)
      else cookies.set(name, value)
    }
    return response
  }
  let orderToken: string | undefined
  let csrfToken: string | undefined
  const api = createApiClient({
    baseUrl: `${ORIGIN}/api/v1`,
    fetch,
    getCsrfToken: () => csrfToken,
    getOrderToken: () => orderToken,
  })
  return {
    api,
    db,
    fetch,
    cookies,
    advance(minutes) {
      now = new Date(now.getTime() + minutes * 60_000)
    },
    setOrderToken(token) {
      orderToken = token
    },
    setCsrfToken(token) {
      csrfToken = token
    },
    raw(path, init) {
      return fetch(new Request(`${ORIGIN}/api/v1${path}`, init))
    },
  }
}

/** Pedido válido: un Mate Imperial Premium con envío a domicilio ($39.999 + $6.500). */
export function orderInput(overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
  return {
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
    ...overrides,
  }
}

/** Manda `POST /orders` crudo con una clave de idempotencia. */
export function postOrder(
  mock: CheckoutApi,
  body: unknown,
  key: string | null = randomUuid(),
): Promise<Response> {
  return mock.raw('/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key === null ? {} : { 'Idempotency-Key': key }),
    },
    body: JSON.stringify(body),
  })
}

/** Crea un pedido válido y deja su token puesto en el cliente. */
export async function placeOrder(
  mock: CheckoutApi,
  overrides: Partial<CreateOrderInput> = {},
): Promise<CreateOrderResult> {
  const response = await postOrder(mock, orderInput(overrides))
  if (response.status !== 201) {
    throw new Error(
      `No se pudo crear el pedido: ${String(response.status)} ${await response.text()}`,
    )
  }
  const result = (await response.json()) as CreateOrderResult
  mock.setOrderToken(result.orderToken)
  return result
}
