// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { getMyOrder, listMyOrders } from '@galpon/api-client'
import { ACCOUNT_COPY } from './account.copy'
import { OrderDetail } from './OrderDetail'
import { OrdersList } from './OrdersList'
import { createAccountTestApi, placeOrder, signUp } from './test/support'

afterEach(cleanup)

describe('OrdersList', () => {
  it('sin pedidos muestra "Todavía no hiciste pedidos" y el acceso a la tienda', () => {
    const testApi = createAccountTestApi()
    render(
      testApi.wrap(<OrdersList initialPage={{ items: [], page: 1, pageSize: 10, total: 0 }} />),
    )

    expect(screen.getByText(ACCOUNT_COPY.orders.empty)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: ACCOUNT_COPY.orders.shop })).toHaveAttribute(
      'href',
      '/tienda',
    )
  })

  it('lista cada pedido con su estado, total y enlace al detalle', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    const { number } = (await placeOrder(testApi.api)).order
    const page = await listMyOrders(testApi.api, 1)
    render(testApi.wrap(<OrdersList initialPage={page} />))

    const row = screen.getByRole('listitem')
    expect(within(row).getByRole('link', { name: new RegExp(number) })).toHaveAttribute(
      'href',
      `/cuenta/pedidos/${number}`,
    )
    expect(within(row).getByText('Esperando el pago')).toBeInTheDocument()
    expect(within(row).getByText('$46.499')).toBeInTheDocument()
    expect(within(row).getByText(/1 producto/)).toBeInTheDocument()
  })
})

describe('OrderDetail', () => {
  it('muestra estado, pago, envío, líneas y totales del pedido', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    const { number } = (await placeOrder(testApi.api)).order
    const order = await getMyOrder(testApi.api, number)
    render(<OrderDetail order={order} />)

    expect(screen.getByRole('heading', { level: 1, name: number })).toBeInTheDocument()
    expect(screen.getAllByText('Esperando el pago').length).toBeGreaterThan(0)
    expect(screen.getByText('Sin pagar')).toBeInTheDocument()
    expect(screen.getByText('Mercado Pago')).toBeInTheDocument()
    expect(screen.getByText('Envío a domicilio')).toBeInTheDocument()
    expect(screen.getByText('Av. Corrientes 1234, 5° B')).toBeInTheDocument()
    expect(screen.getByText('Mate Imperial Premium')).toBeInTheDocument()
    const total = screen.getByText(ACCOUNT_COPY.order.total).closest('div')
    expect(total).toHaveTextContent('$46.499')
    expect(screen.getByRole('link', { name: ACCOUNT_COPY.order.back })).toHaveAttribute(
      'href',
      '/cuenta/pedidos',
    )
  })
})
