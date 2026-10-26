// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from './cart.store'
import { EMPTY_SEEN } from './reconcile'
import { useCartQuoteInput } from './use-cart-quote-input'

beforeEach(() => {
  useCartStore.setState({ lines: [], seen: EMPTY_SEEN, hasHydrated: true, isOpen: false })
})

afterEach(cleanup)

describe('useCartQuoteInput', () => {
  it('arma las líneas del carrito guardado con el precio que ya tenía y se actualiza al cambiarlo', () => {
    useCartStore.setState({
      lines: [{ type: 'product', productId: 'prd-yerba-canarias', quantity: 2 }],
      seen: { prices: { 'prd-yerba-canarias': 9999 }, kitDiscountPercent: null },
    })
    const { result } = renderHook(() => useCartQuoteInput())

    expect(result.current).toEqual({
      items: [
        {
          type: 'product',
          productId: 'prd-yerba-canarias',
          quantity: 2,
          options: null,
          expectedUnitPriceArs: 9999,
        },
      ],
    })

    act(() => {
      useCartStore.getState().setLineQuantity('product:prd-yerba-canarias:-:-', 3)
    })

    expect(result.current.items[0]?.quantity).toBe(3)
  })

  it('con el carrito vacío no hay líneas', () => {
    const { result } = renderHook(() => useCartQuoteInput())

    expect(result.current).toEqual({ items: [] })
  })
})
