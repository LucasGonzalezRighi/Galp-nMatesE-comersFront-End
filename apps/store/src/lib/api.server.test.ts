import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { ApiClient, ApiFetch } from '@galpon/api-client'
import { requireAccountData } from '@/features/account'
import {
  createApiClient,
  createOrder,
  getCustomerCsrfToken,
  getMe,
  getMyOrder,
  register,
} from '@galpon/api-client'
import { getServerApiForRequest } from './api.server'
import { getStoreMockFetch } from './mock.server'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))

beforeAll(() => {
  vi.stubEnv('API_MODE', 'mock')
  vi.stubEnv('MOCK_LATENCY_MS', '0')
})

/** Cookies del pedido entrante, con la forma de las que entrega `cookies()` de Next. */
function incomingCookies(values: Record<string, string>): {
  getAll: () => { name: string; value: string }[]
} {
  return { getAll: () => Object.entries(values).map(([name, value]) => ({ name, value })) }
}

/**
 * Crea una cuenta desde un navegador de prueba contra la API simulada del proceso.
 *
 * @returns El cliente de ese navegador (con su cookie) y el valor de la cookie de sesión.
 */
async function customer(email: string): Promise<{ api: ApiClient; session: string }> {
  let cookie = ''
  let csrf = ''
  const fetch: ApiFetch = async (request) => {
    if (cookie !== '') request.headers.set('Cookie', cookie)
    const response = await getStoreMockFetch()(request)
    const [pair = ''] = (response.headers.getSetCookie()[0] ?? '').split(';')
    if (pair !== '') cookie = pair
    return response
  }
  const api = createApiClient({
    baseUrl: 'http://localhost/api/v1',
    fetch,
    getCsrfToken: () => (csrf === '' ? undefined : csrf),
  })
  csrf = (await getCustomerCsrfToken(api)).csrfToken
  await register(api, {
    email,
    firstName: 'Lucía',
    lastName: 'Pérez',
    password: 'mate-amargo-2026',
  })
  return { api, session: cookie.split('=')[1] ?? '' }
}

describe('getServerApiForRequest', () => {
  it('manda la cookie de sesión entrante: el cliente ve sus datos', async () => {
    const { session } = await customer('server-me@ejemplo.com')

    const api = getServerApiForRequest(incomingCookies({ galpon_session: session }))

    await expect(getMe(api)).resolves.toMatchObject({ email: 'server-me@ejemplo.com' })
  })

  it('sin cookie de sesión la API responde 401', async () => {
    const api = getServerApiForRequest(incomingCookies({ otra: 'x' }))

    await expect(getMe(api)).rejects.toMatchObject({ kind: 'unauthorized' })
  })

  it('un pedido de otro cliente es un 404 (página de no encontrado)', async () => {
    const owner = await customer('server-owner@ejemplo.com')
    const created = await createOrder(
      owner.api,
      {
        customer: {
          email: 'server-owner@ejemplo.com',
          firstName: 'Lucía',
          lastName: 'Pérez',
          phone: null,
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
        paymentMethod: 'mp_redirect',
        expectedTotalArs: 46499,
        website: null,
      },
      crypto.randomUUID(),
    )
    const other = await customer('server-other@ejemplo.com')
    const ownerApi = getServerApiForRequest(incomingCookies({ galpon_session: owner.session }))
    const otherApi = getServerApiForRequest(incomingCookies({ galpon_session: other.session }))

    await expect(getMyOrder(ownerApi, created.order.number)).resolves.toMatchObject({
      number: created.order.number,
    })
    await expect(
      requireAccountData(
        () => getMyOrder(otherApi, created.order.number),
        `/cuenta/pedidos/${created.order.number}`,
      ),
    ).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  })
})
