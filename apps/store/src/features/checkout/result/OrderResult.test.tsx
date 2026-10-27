// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@galpon/api-client'
import { cancelPayment, createMercadoPagoPreference } from '@galpon/api-client'
import { queryKeys } from '@galpon/api-client/react'
import type { ResultTestApi } from './test/support'
import {
  clearOrderSession,
  readOrderSession,
  saveChallengeUrl,
  saveOrderSession,
} from '../order-session'
import { CHALLENGE_DONE_MESSAGE } from './mp-simulator'
import { OrderResult } from './OrderResult'
import { RESULT_COPY } from './result.copy'
import {
  createResultTestApi,
  orderReads,
  payWithTestCard,
  placeGuestOrder,
  postMock,
  TEST_CART_HASH,
} from './test/support'

/** Router y carrito simulados: cada prueba los revisa o los cambia. */
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  clearCart: vi.fn(),
  openCart: vi.fn(),
  cartHash: '00000000c0ffee',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.push, refresh: vi.fn() }),
}))

vi.mock('@/features/cart', () => ({
  clearCart: mocks.clearCart,
  openCart: mocks.openCart,
  useCart: () => ({ lines: [], count: 0, hasHydrated: true, isOpen: false }),
  cartHash: () => mocks.cartHash,
}))

beforeEach(() => {
  mocks.push.mockReset()
  mocks.clearCart.mockReset()
  mocks.openCart.mockReset()
  mocks.cartHash = TEST_CART_HASH
  clearOrderSession()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('OrderResult: pedido que no se encuentra (RF 2)', () => {
  it('sin pedido en la pestaña muestra "No encontramos ese pedido" y no consulta la API', async () => {
    const testApi = createResultTestApi()
    render(testApi.wrap(<OrderResult number="GLP-10001" apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.notFound.title }),
    ).toBeInTheDocument()
    expect(testApi.requests).toHaveLength(0)
  })

  it('con otro número en la pestaña tampoco consulta ni revela nada', async () => {
    const testApi = createResultTestApi()
    await placeGuestOrder(testApi)
    testApi.requests.length = 0
    render(testApi.wrap(<OrderResult number="GLP-99999" apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.notFound.title }),
    ).toBeInTheDocument()
    expect(testApi.requests).toHaveLength(0)
  })

  it('sin número en la dirección muestra lo mismo', async () => {
    const testApi = createResultTestApi()
    await placeGuestOrder(testApi)
    render(testApi.wrap(<OrderResult number={null} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.notFound.title }),
    ).toBeInTheDocument()
  })

  it('con un token que la API no reconoce (404) muestra lo mismo', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    saveOrderSession({ number: order.number, orderToken: 'ot_otro', cartHash: TEST_CART_HASH })
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.notFound.title }),
    ).toBeInTheDocument()
  })
})

describe('OrderResult: cada estado del pago (spec 14.2)', () => {
  it('approved: agradece por el nombre, muestra el detalle y vacía el carrito', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, 'APRO')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.approved.title('Lucía') }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(RESULT_COPY.approved.text(order.number, 'lucia@ejemplo.com')),
    ).toBeInTheDocument()
    expect(screen.getByText('Mate Imperial Premium')).toBeInTheDocument()
    expect(screen.getByText('$46.499')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: RESULT_COPY.approved.keepShopping })).toHaveAttribute(
      'href',
      '/tienda',
    )
    expect(mocks.clearCart).toHaveBeenCalledTimes(1)
  })

  it('approved con un carrito nuevo armado en la pestaña no lo vacía', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, 'APRO')
    // El carrito de ahora no es el del pedido pagado.
    mocks.cartHash = 'ffffffffffffff'
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.approved.title('Lucía') }),
    ).toBeInTheDocument()
    expect(mocks.clearCart).not.toHaveBeenCalled()
  })

  it('en el seguimiento del pedido (/pedido) no vacía el carrito ni agradece de nuevo', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, 'APRO')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" variant="tracking" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.tracking.title(order.number) }),
    ).toBeInTheDocument()
    expect(screen.getByText(RESULT_COPY.orderStatus.paid)).toBeInTheDocument()
    expect(mocks.clearCart).not.toHaveBeenCalled()
  })

  it('rejected: muestra el motivo en español y "Probar con otro medio" reutiliza el pedido', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, 'FUND')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(await screen.findByText('La tarjeta no tiene fondos suficientes.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: RESULT_COPY.rejected.retry }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/checkout?pedido=${order.number}`)
    })
    expect(
      testApi.requests.some(
        (request) => request.method === 'POST' && request.url.endsWith('/cancel-payment'),
      ),
    ).toBe(true)
    expect(readOrderSession()?.number).toBe(order.number)
  })

  it('rejected con el carrito cambiado: olvida el pedido y arma uno nuevo', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, 'OTHE')
    mocks.cartHash = 'ffffffffffffff'
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    await userEvent.click(await screen.findByRole('button', { name: RESULT_COPY.rejected.retry }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/checkout')
    })
    expect(readOrderSession()).toBeNull()
    expect(testApi.requests.some((request) => request.url.endsWith('/cancel-payment'))).toBe(false)
  })

  it('none: "No completaste el pago" y "Pagar" vuelve al paso 3 con el mismo pedido', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.unpaid.title }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: RESULT_COPY.unpaid.pay }))

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/checkout?pedido=${order.number}`)
    })
  })

  it('cancelled con el pedido pendiente: también "No completaste el pago" (Ruling P3-6)', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await createMercadoPagoPreference(testApi.api, order.number, crypto.randomUUID())
    await cancelPayment(testApi.api, order.number)
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.unpaid.title }),
    ).toBeInTheDocument()
    expect(screen.queryByText(RESULT_COPY.expired.title)).not.toBeInTheDocument()
  })

  it('pedido vencido (RF 4): "El pedido venció" y "Volver al carrito" abre el carrito', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await postMock(testApi, `/__mock/orders/${order.number}/expire`)
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.expired.title }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: RESULT_COPY.expired.backToCart }))

    expect(mocks.openCart).toHaveBeenCalledTimes(1)
  })

  it('pending: consulta cada 5 s y a los 2 min deja de consultar y avisa por mail', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, 'CONT')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.pending.title }),
    ).toBeInTheDocument()
    expect(orderReads(testApi)).toHaveLength(1)

    await act(() => vi.advanceTimersByTimeAsync(5_000))
    await waitFor(() => {
      expect(orderReads(testApi)).toHaveLength(2)
    })

    await act(() => vi.advanceTimersByTimeAsync(115_000))
    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.pending.timeoutTitle }),
    ).toBeInTheDocument()
    const reads = orderReads(testApi).length
    expect(reads).toBeLessThanOrEqual(25)

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(orderReads(testApi)).toHaveLength(reads)
  })

  it('pending que se acredita mientras espera: pasa al agradecimiento', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await createMercadoPagoPreference(testApi.api, order.number, crypto.randomUUID())
    await postMock(testApi, '/__mock/mercadopago/resolve', {
      number: order.number,
      intent: null,
      result: 'pending',
    })
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))
    await screen.findByRole('heading', { name: RESULT_COPY.pending.title })

    await postMock(testApi, '/__mock/mercadopago/resolve', {
      number: order.number,
      intent: null,
      result: 'approved',
    })
    await act(() => vi.advanceTimersByTimeAsync(5_000))

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.approved.title('Lucía') }),
    ).toBeInTheDocument()
  })

  it('anuncia el cambio de estado en una región siempre montada (de pendiente a aprobado)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await createMercadoPagoPreference(testApi.api, order.number, crypto.randomUUID())
    await postMock(testApi, '/__mock/mercadopago/resolve', {
      number: order.number,
      intent: null,
      result: 'pending',
    })
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))
    await screen.findByRole('heading', { name: RESULT_COPY.pending.title })
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(RESULT_COPY.pending.title)

    await postMock(testApi, '/__mock/mercadopago/resolve', {
      number: order.number,
      intent: null,
      result: 'approved',
    })
    await act(() => vi.advanceTimersByTimeAsync(5_000))
    await screen.findByRole('heading', { name: RESULT_COPY.approved.title('Lucía') })

    // El panel pendiente se desmontó, pero la región es la misma y ahora dice el estado nuevo.
    expect(status).toBeInTheDocument()
    expect(status).toHaveTextContent(RESULT_COPY.approved.title('Lucía'))
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('action_required (modo de prueba): retoma el desafío y al terminar consulta el pedido', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, '3DS')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.querySelector('iframe')).toHaveAttribute(
      'src',
      `/checkout/mp-simulado?pedido=${order.number}&challenge=1`,
    )

    window.dispatchEvent(
      new MessageEvent('message', { data: CHALLENGE_DONE_MESSAGE, origin: 'https://evil.example' }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await postMock(testApi, '/__mock/mercadopago/resolve', {
      number: order.number,
      intent: null,
      result: 'approved',
    })
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: CHALLENGE_DONE_MESSAGE,
          origin: window.location.origin,
        }),
      )
    })

    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.approved.title('Lucía') }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('action_required en vivo con la dirección que guardó el checkout: retoma el desafío', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, '3DS')
    const challengeUrl = 'https://www.mercadopago.com.ar/3ds/challenge?id=abc123'
    saveChallengeUrl(order.number, challengeUrl)
    render(testApi.wrap(<OrderResult number={order.number} apiMode="live" />))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.querySelector('iframe')).toHaveAttribute('src', challengeUrl)
    expect(
      screen.queryByRole('button', { name: RESULT_COPY.actionRequired.payAgain }),
    ).not.toBeInTheDocument()

    // Si lo cierra sin terminar, puede volver a abrirlo.
    await userEvent.click(screen.getByRole('button', { name: /Ya terminé/ }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    await userEvent.click(
      await screen.findByRole('button', { name: RESULT_COPY.actionRequired.verify }),
    )
    expect(screen.getByRole('dialog').querySelector('iframe')).toHaveAttribute('src', challengeUrl)
  })

  it('action_required en vivo (sin la dirección del desafío): ofrece pagar de nuevo', async () => {
    const testApi = createResultTestApi()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, '3DS')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="live" />))

    await userEvent.click(
      await screen.findByRole('button', { name: RESULT_COPY.actionRequired.payAgain }),
    )

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(`/checkout?pedido=${order.number}`)
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('OrderResult: pedido sembrado en la cache al crearlo (la cache dura un minuto)', () => {
  /** Como `Providers`: los datos son frescos por un minuto, y el checkout sembró el pedido. */
  async function placeSeededOrder(testApi: ResultTestApi): Promise<Order> {
    testApi.queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 60_000 } })
    const order = await placeGuestOrder(testApi)
    testApi.queryClient.setQueryData(queryKeys.order(order.number), order)
    return order
  }

  it('después de un pago aprobado consulta el pedido y agradece, sin pasar por "No completaste el pago"', async () => {
    const testApi = createResultTestApi()
    const order = await placeSeededOrder(testApi)
    await payWithTestCard(testApi, order.number, 'APRO')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    // El pedido sembrado (sin pagar) no se muestra como si fuera el actual.
    expect(screen.getByText(RESULT_COPY.loading)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: RESULT_COPY.unpaid.title }),
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: RESULT_COPY.approved.title('Lucía') }),
    ).toBeInTheDocument()
    expect(orderReads(testApi)).toHaveLength(1)
    expect(mocks.clearCart).toHaveBeenCalledTimes(1)
  })

  it('después de un pago rechazado muestra el motivo', async () => {
    const testApi = createResultTestApi()
    const order = await placeSeededOrder(testApi)
    await payWithTestCard(testApi, order.number, 'FUND')
    render(testApi.wrap(<OrderResult number={order.number} apiMode="mock" />))

    expect(await screen.findByText('La tarjeta no tiene fondos suficientes.')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: RESULT_COPY.unpaid.title }),
    ).not.toBeInTheDocument()
  })
})
