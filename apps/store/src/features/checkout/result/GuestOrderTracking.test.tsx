// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuestOrderTracking } from './GuestOrderTracking'

/** Parámetros de la ruta y props recibidas por el resultado, para revisarlos en cada prueba. */
const mocks = vi.hoisted(() => {
  const params: { numero?: string } = {}
  return { params, orderResult: vi.fn() }
})

vi.mock('next/navigation', () => ({
  useParams: () => mocks.params,
}))

vi.mock('./OrderResult', () => ({
  OrderResult: (props: unknown) => {
    mocks.orderResult(props)
    return <div data-testid="order-result" />
  },
}))

afterEach(() => {
  cleanup()
  mocks.orderResult.mockReset()
})

describe('GuestOrderTracking', () => {
  it('muestra el seguimiento del número de la dirección con el modo de la API', () => {
    mocks.params.numero = 'GLP-10001'
    render(<GuestOrderTracking apiMode="mock" />)
    expect(screen.getByTestId('order-result')).toBeInTheDocument()
    expect(mocks.orderResult).toHaveBeenCalledWith({
      number: 'GLP-10001',
      apiMode: 'mock',
      variant: 'tracking',
    })
  })

  it('sin número en la dirección pasa null (el resultado dice que no encuentra el pedido)', () => {
    delete mocks.params.numero
    render(<GuestOrderTracking apiMode="live" />)
    expect(mocks.orderResult).toHaveBeenCalledWith({
      number: null,
      apiMode: 'live',
      variant: 'tracking',
    })
  })
})
