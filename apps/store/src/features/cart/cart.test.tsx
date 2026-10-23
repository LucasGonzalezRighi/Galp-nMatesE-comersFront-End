// @vitest-environment jsdom

import { QueryClient } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '@galpon/api-client'
import { hideToast, Toaster } from '../toast'
import {
  addKitToCart,
  addProductToCart,
  closeCart,
  KIT_CART_OPEN_DELAY_MS,
  openCart,
  type AddKitInput,
  type AddProductInput,
  type AddToCartResult,
  type CartableProduct,
} from './actions'
import { syncCart } from './cart-sync'
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  ensureCartHydrated,
  useCartStore,
} from './cart.store'
import { EMPTY_SEEN } from './reconcile'
import { createTestApi } from './test/support'

const mate: CartableProduct = {
  id: 'm1',
  name: 'Mate Imperial Premium',
  group: 'mate',
  priceArs: 39999,
  maxQuantity: 5,
  isPurchasable: true,
}
const bombilla: CartableProduct = { ...mate, id: 'b1', name: 'Bombillón Curvo', group: 'bombilla' }
const yerba: CartableProduct = { ...mate, id: 'y1', name: 'Yerba Canarias', group: 'yerba' }

/** Estado actual del carrito. */
function cart(): ReturnType<typeof useCartStore.getState> {
  return useCartStore.getState()
}

/** Lo que anuncia el aviso ("título. subtítulo"); vacío si no hay ninguno a la vista. */
function announced(): HTMLElement {
  return screen.getByRole('status', { hidden: true })
}

/** Agrega un producto dentro de `act`, porque actualiza al aviso montado. */
function add(input: AddProductInput): AddToCartResult {
  let result: AddToCartResult | undefined
  act(() => {
    result = addProductToCart(input)
  })
  if (result === undefined) throw new Error('addProductToCart no devolvió nada')
  return result
}

/** Agrega un kit dentro de `act`. */
function addKit(input: AddKitInput): AddToCartResult {
  let result: AddToCartResult | undefined
  act(() => {
    result = addKitToCart(input)
  })
  if (result === undefined) throw new Error('addKitToCart no devolvió nada')
  return result
}

beforeEach(() => {
  localStorage.clear()
  useCartStore.setState({ lines: [], seen: EMPTY_SEEN, hasHydrated: false, isOpen: false })
  render(<Toaster />)
})

afterEach(() => {
  act(() => {
    hideToast()
  })
  cleanup()
  vi.useRealTimers()
})

describe('addProductToCart', () => {
  it('suma la línea, muestra el aviso "Agregado al carrito" con el nombre y recuerda el precio', () => {
    const result = add({ product: mate })

    expect(result).toEqual({ status: 'added', quantity: 1 })
    expect(cart().lines).toEqual([
      {
        type: 'product',
        productId: 'm1',
        quantity: 1,
        options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
      },
    ])
    expect(announced()).toHaveTextContent('Agregado al carrito. Mate Imperial Premium')
    expect(screen.getByRole('button', { name: 'Ver carrito' })).toBeVisible()
    expect(cart().seen.prices).toEqual({ m1: 39999 })
  })

  it('las bombillas y las yerbas no llevan opciones', () => {
    add({ product: bombilla })

    expect(cart().lines).toEqual([{ type: 'product', productId: 'b1', quantity: 1 }])
  })

  it('usa el cuero y la virola elegidos y suma las líneas iguales', () => {
    const options = { leather: 'Borravino', ferrule: 'Acero' } as const
    add({ product: mate, options })
    add({ product: mate, options, quantity: 2 })

    expect(cart().lines).toEqual([{ type: 'product', productId: 'm1', quantity: 3, options }])
  })

  it('un doble clic rápido nunca supera el tope de compra (remainingQuantityFor)', () => {
    const limited = { ...mate, maxQuantity: 2 }

    const results = [1, 2, 3].map(() => add({ product: limited }))

    expect(results.map((result) => result.status)).toEqual(['added', 'added', 'limit'])
    expect(cart().lines).toEqual([expect.objectContaining({ productId: 'm1', quantity: 2 })])
    expect(announced()).toHaveTextContent('Ya tenés el máximo disponible')
  })

  it('el tope vale para el producto en todas las líneas: sueltas y dentro de kits', () => {
    const limited = { ...mate, maxQuantity: 2 }
    addKit({ pieces: { mate: limited, bombilla, yerba }, leather: 'Negro', discountPercent: 10 })

    const first = add({ product: limited })
    const second = add({ product: limited })

    expect([first.status, second.status]).toEqual(['added', 'limit'])
  })

  it('con una cantidad mayor al lugar que queda, suma solo lo que entra', () => {
    const result = add({ product: { ...mate, maxQuantity: 3 }, quantity: 10 })

    expect(result).toEqual({ status: 'added', quantity: 3 })
    expect(cart().lines[0]?.quantity).toBe(3)
  })

  it('un producto que no se puede comprar no se agrega ni avisa', () => {
    const result = add({ product: { ...mate, isPurchasable: false } })

    expect(result).toEqual({ status: 'unavailable' })
    expect(cart().lines).toEqual([])
    expect(announced()).toBeEmptyDOMElement()
  })

  it('valida la cantidad, el producto y las opciones', () => {
    expect(() => addProductToCart({ product: mate, quantity: 0 })).toThrow(RangeError)
    expect(() => addProductToCart({ product: mate, quantity: 1.5 })).toThrow(RangeError)
    expect(() => addProductToCart({ product: { ...mate, id: ' ' } })).toThrow(RangeError)
    expect(() =>
      addProductToCart({
        product: mate,
        options: { leather: 'Rosa' as 'Negro', ferrule: 'Acero' },
      }),
    ).toThrow(RangeError)
    expect(cart().lines).toEqual([])
  })

  it('no pisa lo guardado si se agrega antes de hidratar', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          lines: [{ type: 'product', productId: 'guardado', quantity: 1 }],
          seen: EMPTY_SEEN,
        },
        version: CART_STORAGE_VERSION,
      }),
    )

    add({ product: mate })

    expect(cart().lines.map((line) => (line.type === 'product' ? line.productId : 'kit'))).toEqual([
      'guardado',
      'm1',
    ])
    expect(cart().hasHydrated).toBe(true)
  })
})

describe('addKitToCart', () => {
  const pieces = { mate, bombilla, yerba }

  it('suma el kit, avisa el descuento y abre el carrito a los 850 ms', () => {
    vi.useFakeTimers()

    const result = addKit({ pieces, leather: 'Crudo', discountPercent: 10 })

    expect(result).toEqual({ status: 'added', quantity: 1 })
    expect(cart().lines).toEqual([
      {
        type: 'kit',
        mateId: 'm1',
        bombillaId: 'b1',
        yerbaId: 'y1',
        leather: 'Crudo',
        quantity: 1,
      },
    ])
    expect(announced()).toHaveTextContent('Kit agregado al carrito. Descuento de 10% aplicado')
    expect(cart().seen).toEqual({
      prices: { m1: 39999, b1: 39999, y1: 39999 },
      kitDiscountPercent: 10,
    })
    expect(cart().isOpen).toBe(false)

    act(() => {
      vi.advanceTimersByTime(KIT_CART_OPEN_DELAY_MS - 1)
    })
    expect(cart().isOpen).toBe(false)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(cart().isOpen).toBe(true)
  })

  it('un doble clic no supera el tope de ninguna pieza', () => {
    const limited = { mate, bombilla: { ...bombilla, maxQuantity: 1 }, yerba }

    const results = [1, 2].map(() =>
      addKit({ pieces: limited, leather: 'Negro', discountPercent: 10 }),
    )

    expect(results.map((result) => result.status)).toEqual(['added', 'limit'])
    expect(cart().lines[0]?.quantity).toBe(1)
  })

  it('no agrega un kit con piezas sin stock', () => {
    const result = addKit({
      pieces: { ...pieces, yerba: { ...yerba, isPurchasable: false } },
      leather: 'Negro',
      discountPercent: 10,
    })

    expect(result).toEqual({ status: 'unavailable' })
    expect(cart().lines).toEqual([])
  })

  it('valida los grupos de las piezas, el descuento y el cuero', () => {
    expect(() =>
      addKitToCart({
        pieces: { mate: bombilla, bombilla, yerba },
        leather: 'Negro',
        discountPercent: 10,
      }),
    ).toThrow(RangeError)
    expect(() => addKitToCart({ pieces, leather: 'Negro', discountPercent: 31 })).toThrow(
      RangeError,
    )
    expect(() => addKitToCart({ pieces, leather: 'Negro', discountPercent: 1.5 })).toThrow(
      RangeError,
    )
    expect(() => addKitToCart({ pieces, leather: 'Rosa' as 'Negro', discountPercent: 10 })).toThrow(
      RangeError,
    )
  })
})

describe('openCart y closeCart', () => {
  it('abrir el carrito oculta el aviso y lo marca como hidratado', () => {
    add({ product: mate })
    expect(announced()).toHaveTextContent('Agregado al carrito')

    act(() => {
      openCart()
    })

    expect(announced()).toBeEmptyDOMElement()
    expect(cart().isOpen).toBe(true)

    act(() => {
      closeCart()
    })
    expect(cart().isOpen).toBe(false)
  })
})

describe('persistencia en localStorage', () => {
  it('guarda solo ids y cantidades con la clave y la versión de la spec', () => {
    add({ product: mate })

    const stored: unknown = JSON.parse(localStorage.getItem('galpon.cart') ?? 'null')
    expect(stored).toEqual({
      state: {
        lines: [
          {
            type: 'product',
            productId: 'm1',
            quantity: 1,
            options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
          },
        ],
        seen: { prices: { m1: 39999 }, kitDiscountPercent: null },
      },
      version: 1,
    })
  })

  it('lee lo guardado al hidratar y descarta las líneas corruptas', () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          lines: [
            { type: 'product', productId: 'ok', quantity: 2 },
            { type: 'product', productId: 'mal', quantity: -3 },
            'basura',
          ],
          seen: 'basura',
        },
        version: CART_STORAGE_VERSION,
      }),
    )

    ensureCartHydrated()

    expect(cart().hasHydrated).toBe(true)
    expect(cart().lines).toEqual([{ type: 'product', productId: 'ok', quantity: 2 }])
    expect(cart().seen).toEqual(EMPTY_SEEN)
  })

  it.each([
    ['no es JSON', '{'],
    [
      'es de otra versión',
      JSON.stringify({
        state: { lines: [{ type: 'product', productId: 'x', quantity: 1 }] },
        version: 99,
      }),
    ],
  ])('si lo guardado %s, el carrito empieza vacío sin romper', (_motivo, stored) => {
    localStorage.setItem(CART_STORAGE_KEY, stored)

    expect(() => {
      ensureCartHydrated()
    }).not.toThrow()

    expect(cart().lines).toEqual([])
    expect(cart().hasHydrated).toBe(true)
  })
})

describe('syncCart con datos viejos en localStorage (Review Focus 1)', () => {
  /** Guarda un carrito viejo: un producto borrado, otro sin stock, otro con stock menor y uno sano. */
  function seedOldCart(): void {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          lines: [
            { type: 'product', productId: 'prd-borrado', quantity: 1 },
            { type: 'product', productId: 'prd-galleta', quantity: 1 },
            { type: 'product', productId: 'prd-coquito-criollo', quantity: 5 },
            { type: 'product', productId: 'prd-imperial-premium', quantity: 1 },
          ],
          seen: { prices: { 'prd-imperial-premium': 30000 }, kitDiscountPercent: null },
        },
        version: CART_STORAGE_VERSION,
      }),
    )
  }

  /** Concilia dentro de `act`, porque actualiza al aviso montado. */
  async function sync(api: Parameters<typeof syncCart>[0]): Promise<void> {
    await act(async () => {
      await syncCart(api, new QueryClient())
    })
  }

  it('quita el producto borrado, deja el que no tiene stock, baja el de stock menor y avisa', async () => {
    const { api } = createTestApi()
    seedOldCart()
    ensureCartHydrated()

    await sync(api)

    const ids = cart().lines.map((line) => (line.type === 'product' ? line.productId : 'kit'))
    expect(ids).toEqual(['prd-galleta', 'prd-coquito-criollo', 'prd-imperial-premium'])
    // "Mate Coquito Criollo" tiene 2 unidades en el catálogo de fábrica.
    expect(cart().lines[1]).toMatchObject({ quantity: 2 })
    expect(cart().seen.prices['prd-imperial-premium']).toBe(39999)
    expect(announced()).toHaveTextContent(
      'Actualizamos tu carrito. Quitamos un producto que ya no está disponible · y 2 cambios más',
    )
  })

  it('un producto archivado después de agregarlo se quita', async () => {
    const { api, db } = createTestApi()
    const product = db.products.find((candidate) => candidate.id === 'prd-imperial-premium')
    if (product === undefined) throw new Error('Falta el producto de fábrica')
    product.status = 'archived'
    useCartStore.setState({
      lines: [{ type: 'product', productId: 'prd-imperial-premium', quantity: 1 }],
    })

    await sync(api)

    expect(cart().lines).toEqual([])
  })

  it('si no se puede consultar el catálogo, avisa y deja el carrito como estaba', async () => {
    const failing = createApiClient({
      baseUrl: 'http://localhost/api/v1',
      fetch: () => Promise.resolve(new Response('{}', { status: 404 })),
    })
    useCartStore.setState({
      lines: [{ type: 'product', productId: 'prd-imperial-premium', quantity: 1 }],
    })

    await sync(failing)

    expect(announced()).toHaveTextContent('No pudimos actualizar el carrito')
    expect(cart().lines).toHaveLength(1)
  })

  it('con el carrito vacío no consulta nada', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response('{}')))
    const api = createApiClient({ baseUrl: 'http://localhost/api/v1', fetch })

    await sync(api)

    expect(fetch).not.toHaveBeenCalled()
    expect(announced()).toBeEmptyDOMElement()
  })

  it('un carrito con un kit toma el descuento actual y lo recuerda', async () => {
    const { api, db } = createTestApi()
    db.settings.kitDiscountPercent = 15
    useCartStore.setState({
      lines: [
        {
          type: 'kit',
          mateId: 'prd-imperial-premium',
          bombillaId: 'prd-bombillon-premium-curvo',
          yerbaId: 'prd-yerba-canarias',
          leather: 'Negro',
          quantity: 1,
        },
      ],
      seen: { prices: {}, kitDiscountPercent: 10 },
    })

    await sync(api)

    expect(cart().seen.kitDiscountPercent).toBe(15)
    expect(announced()).toHaveTextContent('El descuento del kit ahora es de 15%')
  })
})
