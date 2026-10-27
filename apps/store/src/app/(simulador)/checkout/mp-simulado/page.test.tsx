import { describe, expect, it, vi } from 'vitest'

/** Modo de la API de cada prueba y `notFound` simulado (lanza, como el de Next). */
const mocks = vi.hoisted(() => ({
  apiMode: 'mock',
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@/lib/env', () => ({ getStoreEnv: () => ({ apiMode: mocks.apiMode }) }))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('@/features/checkout', () => ({
  MercadoPagoSimulator: () => null,
  OrderResultLoading: () => null,
}))

const { default: MercadoPagoSimulatorRoute, metadata } = await import('./page')

describe('/checkout/mp-simulado', () => {
  it('no se indexa', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it('en vivo no existe (404)', () => {
    mocks.apiMode = 'live'
    expect(() => MercadoPagoSimulatorRoute()).toThrow('NEXT_NOT_FOUND')
  })

  it('en modo de prueba se muestra', () => {
    mocks.apiMode = 'mock'
    mocks.notFound.mockClear()
    expect(MercadoPagoSimulatorRoute()).not.toBeNull()
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
})
