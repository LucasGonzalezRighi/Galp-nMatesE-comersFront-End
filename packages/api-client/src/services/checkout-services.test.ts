import { describe, expect, it } from 'vitest'
import type { ApiClient } from '../client'
import {
  cancelPayment,
  createMercadoPagoPreference,
  createMyAddress,
  createOrder,
  deleteMyAddress,
  forgotPassword,
  getCustomerCsrfToken,
  getInstallments,
  getMe,
  getMyOrder,
  getOrder,
  listMyAddresses,
  listMyOrders,
  login,
  logout,
  payWithCard,
  quoteCart,
  quoteShipping,
  register,
  resetPassword,
  updateMe,
  updateMyAddress,
} from '.'
import { createApiClient } from '../client'
import { createFakeFetch, jsonResponse } from '../test/fake-fetch'

const KEY = '3f2b8c1e-5d4a-4e7b-9a60-1c2d3e4f5a6b'
const NUMBER = 'GLP-12345'
const ITEMS = [{ type: 'product' as const, productId: 'prd-a', quantity: 1, options: null }]
const ADDRESS = {
  label: null,
  street: 'Av. Corrientes',
  number: '1234',
  apartment: null,
  postalCode: 'C1043',
  city: 'CABA',
  province: 'CABA' as const,
  isDefault: false,
}
const CARD = {
  token: 'tok',
  paymentMethodId: 'visa',
  issuerId: null,
  installments: 1,
  payer: { email: 'a@b.com', identification: { type: 'DNI', number: '12345678' } },
}

interface Case {
  name: string
  run: (api: ApiClient) => Promise<unknown>
  method: string
  path: string
  body?: unknown
  idempotencyKey?: string
  status?: number
}

const cases: Case[] = [
  {
    name: 'quoteCart',
    run: (api) => quoteCart(api, { items: ITEMS }),
    method: 'POST',
    path: '/cart/quote',
    body: { items: ITEMS },
  },
  {
    name: 'quoteShipping',
    run: (api) => quoteShipping(api, { method: 'pickup', postalCode: null, items: ITEMS }),
    method: 'POST',
    path: '/shipping/quote',
    body: { method: 'pickup', postalCode: null, items: ITEMS },
  },
  {
    name: 'createOrder',
    run: (api) =>
      createOrder(
        api,
        {
          customer: { email: 'a@b.com', firstName: 'Ana', lastName: 'Gil', phone: null },
          shipping: { method: 'pickup', address: null },
          items: ITEMS,
          paymentMethod: 'card',
          expectedTotalArs: 100,
          website: null,
        },
        KEY,
      ),
    method: 'POST',
    path: '/orders',
    idempotencyKey: KEY,
    status: 201,
  },
  {
    name: 'getOrder',
    run: (api) => getOrder(api, NUMBER),
    method: 'GET',
    path: `/orders/${NUMBER}`,
  },
  {
    name: 'createMercadoPagoPreference',
    run: (api) => createMercadoPagoPreference(api, NUMBER, KEY),
    method: 'POST',
    path: `/orders/${NUMBER}/payments/mercadopago/preference`,
    idempotencyKey: KEY,
  },
  {
    name: 'payWithCard',
    run: (api) => payWithCard(api, NUMBER, CARD, KEY),
    method: 'POST',
    path: `/orders/${NUMBER}/payments/mercadopago/card`,
    body: CARD,
    idempotencyKey: KEY,
  },
  {
    name: 'getInstallments',
    run: (api) => getInstallments(api, NUMBER, { bin: '450995', paymentTypeId: 'credit_card' }),
    method: 'POST',
    path: `/orders/${NUMBER}/payments/mercadopago/installments`,
    body: { bin: '450995', paymentTypeId: 'credit_card' },
  },
  {
    name: 'cancelPayment',
    run: (api) => cancelPayment(api, NUMBER),
    method: 'POST',
    path: `/orders/${NUMBER}/cancel-payment`,
    status: 204,
  },
  { name: 'getCustomerCsrfToken', run: getCustomerCsrfToken, method: 'GET', path: '/auth/csrf' },
  {
    name: 'register',
    run: (api) =>
      register(api, { email: 'a@b.com', firstName: 'Ana', lastName: 'Gil', password: 'x' }),
    method: 'POST',
    path: '/auth/register',
    status: 201,
  },
  {
    name: 'login',
    run: (api) => login(api, { email: 'a@b.com', password: 'x' }),
    method: 'POST',
    path: '/auth/login',
    body: { email: 'a@b.com', password: 'x' },
  },
  { name: 'logout', run: logout, method: 'POST', path: '/auth/logout', status: 204 },
  {
    name: 'forgotPassword',
    run: (api) => forgotPassword(api, { email: 'a@b.com' }),
    method: 'POST',
    path: '/auth/password/forgot',
    status: 202,
  },
  {
    name: 'resetPassword',
    run: (api) => resetPassword(api, { token: 'RESET-OK', password: 'x' }),
    method: 'POST',
    path: '/auth/password/reset',
    status: 204,
  },
  { name: 'getMe', run: getMe, method: 'GET', path: '/me' },
  {
    name: 'updateMe',
    run: (api) => updateMe(api, { phone: null }),
    method: 'PATCH',
    path: '/me',
    body: { phone: null },
  },
  { name: 'listMyOrders', run: (api) => listMyOrders(api), method: 'GET', path: '/me/orders' },
  {
    name: 'listMyOrders (página 2)',
    run: (api) => listMyOrders(api, 2),
    method: 'GET',
    path: '/me/orders?page=2',
  },
  {
    name: 'getMyOrder',
    run: (api) => getMyOrder(api, NUMBER),
    method: 'GET',
    path: `/me/orders/${NUMBER}`,
  },
  { name: 'listMyAddresses', run: listMyAddresses, method: 'GET', path: '/me/addresses' },
  {
    name: 'createMyAddress',
    run: (api) => createMyAddress(api, ADDRESS),
    method: 'POST',
    path: '/me/addresses',
    body: ADDRESS,
    status: 201,
  },
  {
    name: 'updateMyAddress',
    run: (api) => updateMyAddress(api, 'adr-1', ADDRESS),
    method: 'PATCH',
    path: '/me/addresses/adr-1',
    body: ADDRESS,
  },
  {
    name: 'deleteMyAddress',
    run: (api) => deleteMyAddress(api, 'adr-1'),
    method: 'DELETE',
    path: '/me/addresses/adr-1',
    status: 204,
  },
]

describe('servicios de checkout y cuenta', () => {
  it.each(cases)(
    '$name pide $method $path',
    async ({ run, method, path, body, idempotencyKey, status = 200 }) => {
      const { fetch, requests } = createFakeFetch(() =>
        status === 204 || status === 202
          ? new Response(null, { status })
          : jsonResponse({ marker: 'respuesta' }, status),
      )
      const api = createApiClient({ baseUrl: 'http://x/api/v1', fetch })
      await run(api)
      expect(requests).toHaveLength(1)
      const [request] = requests
      if (request === undefined) throw new Error('No se hizo ningún pedido')
      const url = new URL(request.url)
      expect(request.method).toBe(method)
      expect(`${url.pathname}${url.search}`).toBe(`/api/v1${path}`)
      expect(request.headers.get('Idempotency-Key')).toBe(idempotencyKey ?? null)
      if (body !== undefined) await expect(request.json()).resolves.toEqual(body)
    },
  )
})

describe('validación de entradas de checkout y cuenta', () => {
  const { fetch } = createFakeFetch(() => jsonResponse({}))
  const api = createApiClient({ baseUrl: 'http://x/api/v1', fetch })
  const numberMessage = 'El número de pedido tiene que ser GLP- y cinco dígitos'
  const keyMessage = 'La Idempotency-Key tiene que ser un UUID'

  it.each([[''], ['GLP-123'], ['glp-12345'], ['GLP-12345/x']])(
    'rechaza el número de pedido %j',
    async (number) => {
      await expect(getOrder(api, number)).rejects.toThrow(new RangeError(numberMessage))
      await expect(getMyOrder(api, number)).rejects.toThrow(RangeError)
      await expect(cancelPayment(api, number)).rejects.toThrow(RangeError)
      await expect(createMercadoPagoPreference(api, number, KEY)).rejects.toThrow(RangeError)
      await expect(payWithCard(api, number, CARD, KEY)).rejects.toThrow(RangeError)
      await expect(
        getInstallments(api, number, { bin: '450995', paymentTypeId: 'debit_card' }),
      ).rejects.toThrow(RangeError)
    },
  )

  it.each([[''], ['no-es-uuid'], [`${KEY}x`]])('rechaza la Idempotency-Key %j', async (key) => {
    await expect(createMercadoPagoPreference(api, NUMBER, key)).rejects.toThrow(
      new RangeError(keyMessage),
    )
    await expect(payWithCard(api, NUMBER, CARD, key)).rejects.toThrow(RangeError)
  })

  it.each([[''], ['..'], ['a/b'], ['a'.repeat(81)]])(
    'rechaza el id de dirección %j',
    async (id) => {
      await expect(deleteMyAddress(api, id)).rejects.toThrow(RangeError)
      await expect(updateMyAddress(api, id, ADDRESS)).rejects.toThrow(RangeError)
    },
  )

  it.each([[0], [1.5]])('listMyOrders rechaza la página %j', async (page) => {
    await expect(listMyOrders(api, page)).rejects.toThrow(RangeError)
  })
})
