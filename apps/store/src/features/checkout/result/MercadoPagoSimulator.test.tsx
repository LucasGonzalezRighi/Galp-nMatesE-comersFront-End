// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMercadoPagoPreference } from '@galpon/api-client'
import { clearOrderSession } from '../order-session'
import { MercadoPagoSimulator } from './MercadoPagoSimulator'
import { RESULT_COPY } from './result.copy'
import { createResultTestApi, payWithTestCard, placeGuestOrder } from './test/support'

/** Búsqueda de la dirección y navegación simuladas. */
const mocks = vi.hoisted(() => ({ search: '', assign: vi.fn() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}))

vi.mock('./browser-location', () => ({ assignLocation: mocks.assign }))

const COPY = RESULT_COPY.simulator

beforeEach(() => {
  mocks.search = ''
  mocks.assign.mockReset()
  clearOrderSession()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** API de prueba con el `fetch` del navegador apuntando a ella. */
function setUp(): ReturnType<typeof createResultTestApi> {
  const testApi = createResultTestApi()
  vi.stubGlobal('fetch', testApi.browserFetch)
  return testApi
}

describe('MercadoPagoSimulator: preferencia', () => {
  it('muestra el pedido y el total, y "Aprobar" vuelve al resultado con el pedido pagado', async () => {
    const testApi = setUp()
    const order = await placeGuestOrder(testApi)
    const { initPoint } = await createMercadoPagoPreference(
      testApi.api,
      order.number,
      crypto.randomUUID(),
    )
    mocks.search = new URL(initPoint, 'http://localhost').search
    render(testApi.wrap(<MercadoPagoSimulator />))

    expect(screen.getByText(order.number)).toBeInTheDocument()
    expect(await screen.findByText('$46.499')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: COPY.approve }))

    await waitFor(() => {
      expect(mocks.assign).toHaveBeenCalledWith(`/checkout/resultado?pedido=${order.number}`)
    })
    expect(testApi.db.orders[0]?.status).toBe('paid')
  })

  it.each([
    ['pending', COPY.leavePending],
    ['rejected', COPY.reject],
  ] as const)('el botón de %s aplica ese resultado', async (status, label) => {
    const testApi = setUp()
    const order = await placeGuestOrder(testApi)
    const { initPoint } = await createMercadoPagoPreference(
      testApi.api,
      order.number,
      crypto.randomUUID(),
    )
    mocks.search = new URL(initPoint, 'http://localhost').search
    render(testApi.wrap(<MercadoPagoSimulator />))

    await userEvent.click(screen.getByRole('button', { name: label }))

    await waitFor(() => {
      expect(mocks.assign).toHaveBeenCalledTimes(1)
    })
    expect(testApi.db.orders[0]?.intents.at(-1)?.status).toBe(status)
  })

  it('si el intento ya no está activo lo avisa y no navega', async () => {
    const testApi = setUp()
    const order = await placeGuestOrder(testApi)
    mocks.search = `?pedido=${order.number}&intent=int-viejo`
    render(testApi.wrap(<MercadoPagoSimulator />))

    await userEvent.click(screen.getByRole('button', { name: COPY.approve }))

    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.error)
    expect(mocks.assign).not.toHaveBeenCalled()
  })

  it('sin pedido o sin intento muestra que el link no sirve', () => {
    const testApi = setUp()
    mocks.search = '?pedido=GLP-12345'
    render(testApi.wrap(<MercadoPagoSimulator />))

    expect(screen.getByText(COPY.invalid)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: COPY.approve })).not.toBeInTheDocument()
  })
})

describe('MercadoPagoSimulator: desafío 3-D Secure', () => {
  it('"Confirmar" aprueba el intento activo y pide cerrar la ventana', async () => {
    const testApi = setUp()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, '3DS')
    mocks.search = `?pedido=${order.number}&challenge=1`
    render(testApi.wrap(<MercadoPagoSimulator />))

    expect(screen.queryByRole('button', { name: COPY.approve })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: COPY.confirm }))

    expect(await screen.findByText(COPY.closeWindow)).toBeInTheDocument()
    expect(testApi.db.orders[0]?.status).toBe('paid')
    expect(mocks.assign).not.toHaveBeenCalled()
  })

  it('"Cancelar" rechaza el desafío', async () => {
    const testApi = setUp()
    const order = await placeGuestOrder(testApi)
    await payWithTestCard(testApi, order.number, '3DS')
    mocks.search = `?pedido=${order.number}&challenge=1`
    render(testApi.wrap(<MercadoPagoSimulator />))

    await userEvent.click(screen.getByRole('button', { name: COPY.cancel }))

    expect(await screen.findByText(COPY.closeWindow)).toBeInTheDocument()
    expect(testApi.db.orders[0]?.intents.at(-1)).toMatchObject({
      status: 'rejected',
      statusDetail: 'cc_rejected_3ds_challenge',
    })
  })
})
