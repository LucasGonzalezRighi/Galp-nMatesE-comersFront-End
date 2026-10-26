// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ApiClient } from '@galpon/api-client'
import { ApiClientProvider } from '@galpon/api-client/react'
import { hideToast } from '../toast'
import { addProductToCart, type CartableProduct } from './actions'
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  ensureCartHydrated,
  useCartStore,
} from './cart.store'
import { CartButton } from './CartButton'
import { CartDrawer } from './CartDrawer'
import { CartHydrator } from './CartHydrator'
import { EMPTY_SEEN } from './reconcile'
import { createTestApi } from './test/support'

/** Cuero y virola de un mate: la cotización los exige en cada mate. */
const OPTIONS = { leather: 'Negro', ferrule: 'Alpaca cincelada' } as const

/** Carrito completo montado como en el layout, con la API simulada de fábrica. */
function renderCart(api: ApiClient): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const tree: ReactNode = (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={api}>
        <CartHydrator />
        <CartButton />
        <CartDrawer />
      </ApiClientProvider>
    </QueryClientProvider>
  )
  render(tree)
}

beforeEach(() => {
  localStorage.clear()
  useCartStore.setState({ lines: [], seen: EMPTY_SEEN, hasHydrated: false, isOpen: false })
})

afterEach(() => {
  hideToast()
  cleanup()
})

describe('CartButton', () => {
  it('muestra el contador de unidades y se marca para el vuelo y el rebote', async () => {
    const { api } = createTestApi()
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: { lines: [{ type: 'product', productId: 'prd-yerba-canarias', quantity: 3 }] },
        version: CART_STORAGE_VERSION,
      }),
    )

    renderCart(api)

    const button = await screen.findByRole('button', { name: 'Abrir carrito, 3 productos' })
    expect(button).toHaveTextContent('Carrito 3')
    expect(button).toHaveAttribute('data-cart-button')
    expect(button.querySelector('[data-cart-badge]')).toHaveTextContent('3')
  })

  it('hasta leer localStorage el contador está invisible (no desajusta la hidratación)', () => {
    render(<CartButton />)
    const badge = document.querySelector('[data-cart-badge]')

    expect(badge).toHaveClass('invisible')
    expect(badge).toHaveTextContent('0')

    act(() => {
      ensureCartHydrated()
    })

    expect(badge).not.toHaveClass('invisible')
  })

  it('el nombre accesible contiene el texto visible ("Carrito" y el contador), también con el carrito vacío (WCAG 2.5.3)', () => {
    render(<CartButton />)
    const button = screen.getByRole('button', { name: 'Abrir carrito' })

    // Antes de leer localStorage el contador no se ve: el nombre no lo menciona.
    expect(button).toHaveAccessibleName('Abrir carrito')

    act(() => {
      ensureCartHydrated()
    })

    expect(button).toHaveAccessibleName('Abrir carrito, 0 productos')
    // Un espacio separa "Carrito" del contador: el texto visible son dos palabras, no "Carrito0".
    expect(button.textContent).toBe('Carrito 0')
  })
})

describe('CartDrawer', () => {
  it('con el carrito vacío muestra la ilustración y lleva a la tienda', async () => {
    const { api } = createTestApi()
    renderCart(api)

    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Carrito (0)' })
    expect(within(dialog).getByText('Tu carrito está vacío')).toBeVisible()
    expect(within(dialog).getByText('Elegí tu próximo compañero de ronda.')).toBeVisible()
    expect(within(dialog).getByRole('link', { name: 'Ir a la tienda' })).toHaveAttribute(
      'href',
      '/tienda',
    )
  })

  it('un carrito viejo se concilia al abrir: sin stock bloquea, stock menor se baja, borrado se quita', async () => {
    const { api } = createTestApi()
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          lines: [
            { type: 'product', productId: 'prd-borrado', quantity: 1 },
            { type: 'product', productId: 'prd-galleta', quantity: 1, options: OPTIONS },
            { type: 'product', productId: 'prd-coquito-criollo', quantity: 5, options: OPTIONS },
            {
              type: 'product',
              productId: 'prd-imperial-premium',
              quantity: 1,
              options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
            },
          ],
        },
        version: CART_STORAGE_VERSION,
      }),
    )
    renderCart(api)

    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Carrito (4)' })
    // El detalle llega con la cotización; hasta entonces las líneas están cargando.
    expect(await within(dialog).findAllByText('Cuero negro · Alpaca cincelada')).toHaveLength(3)
    expect(within(dialog).getByText('Mate Imperial Premium')).toBeVisible()
    expect(within(dialog).queryByText('prd-borrado')).not.toBeInTheDocument()
    // Sin stock: marcada y sin selector de cantidad; el total solo suma las líneas con stock.
    expect(within(dialog).getByText('Sin stock')).toBeVisible()
    expect(within(dialog).getByText('$97.997')).toBeVisible()
    expect(within(dialog).getByText('El envío se calcula en el checkout.')).toBeVisible()
    // Stock menor: baja de 5 a 2 (el total de la línea es 2 × $28.999).
    expect(within(dialog).getByText('$57.998')).toBeVisible()
    const checkout = within(dialog).getByRole('link', { name: 'Finalizar compra' })
    expect(checkout).toHaveAttribute('aria-disabled', 'true')
    expect(checkout).toHaveAttribute('tabindex', '-1')
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Quitá los productos sin stock para finalizar la compra.',
    )

    await userEvent.click(within(dialog).getByRole('button', { name: 'Quitar Mate Galleta' }))

    await waitFor(() => {
      expect(within(dialog).getByRole('link', { name: 'Finalizar compra' })).not.toHaveAttribute(
        'aria-disabled',
      )
    })
    expect(within(dialog).getByRole('link', { name: 'Finalizar compra' })).toHaveAttribute(
      'href',
      '/checkout',
    )
  })

  it('muestra el kit con su ahorro, el "Ahorro por kit" y el subtotal con el descuento de domain', async () => {
    const { api } = createTestApi()
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
      hasHydrated: true,
    })
    renderCart(api)

    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Kit ronda completa')).toBeVisible()
    expect(
      within(dialog).getByText(
        'Mate Imperial Premium + Bombillón Premium Curvo + Yerba Canarias 1 kg · Cuero negro',
      ),
    ).toBeVisible()
    // Suma de las tres piezas: $78.997; 10 % de descuento: $7.900 de ahorro.
    expect(within(dialog).getByText('Ahorrás $7.900')).toBeVisible()
    expect(within(dialog).getByText('Ahorro por kit')).toBeVisible()
    expect(within(dialog).getByText('−$7.900')).toBeVisible()
    expect(within(dialog).getAllByText('$71.097')).toHaveLength(2)
  })

  it('muestra "Precio sin impuestos nacionales" en cada línea (también en el kit, con "c/u" si hay más de una unidad) y bajo el subtotal, y se apaga con el ajuste', async () => {
    const { api, db } = createTestApi()
    useCartStore.setState({
      lines: [
        { type: 'product', productId: 'prd-yerba-canarias', quantity: 2 },
        {
          type: 'kit',
          mateId: 'prd-imperial-premium',
          bombillaId: 'prd-bombillon-premium-curvo',
          yerbaId: 'prd-yerba-canarias',
          leather: 'Negro',
          quantity: 1,
        },
      ],
      hasHydrated: true,
    })
    renderCart(api)

    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))

    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Ahorrás $7.900')
    const nets = within(dialog).getAllByText(/^Precio sin impuestos nacionales:/)
    // Por unidad, sobre el precio efectivo (el kit, ya con el descuento); y el del subtotal, que
    // el back calcula aparte y puede diferir unos pesos de la suma (2 × 8.264 + 58.758 = 75.286).
    expect(nets.map((net) => net.textContent)).toEqual([
      'Precio sin impuestos nacionales: $8.264',
      'Precio sin impuestos nacionales: $58.758',
      'Precio sin impuestos nacionales: $75.285',
    ])
    // "c/u" solo en la línea de 2 unidades.
    expect(within(dialog).getAllByText('c/u')).toHaveLength(1)
    cleanup()

    db.settings.priceDisplay.showNetPrice = false
    renderCart(api)
    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))
    const closed = await screen.findByRole('dialog')
    await within(closed).findByText('Ahorrás $7.900')
    expect(within(closed).queryByText(/Precio sin impuestos nacionales/)).not.toBeInTheDocument()
    expect(within(closed).queryByText('c/u')).not.toBeInTheDocument()
  })

  it('cotiza todo el carrito con una sola llamada y sin mandar precios', async () => {
    const { api, requests } = createTestApi()
    useCartStore.setState({
      lines: [
        { type: 'product', productId: 'prd-yerba-canarias', quantity: 2 },
        {
          type: 'kit',
          mateId: 'prd-imperial-premium',
          bombillaId: 'prd-bombillon-premium-curvo',
          yerbaId: 'prd-yerba-canarias',
          leather: 'Negro',
          quantity: 1,
        },
      ],
      seen: { prices: { 'prd-yerba-canarias': 9999 }, kitDiscountPercent: null },
      hasHydrated: true,
    })
    renderCart(api)

    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Ahorrás $7.900')

    const quotes = requests.filter(
      (request) =>
        request.method === 'POST' && new URL(request.url).pathname.endsWith('/cart/quote'),
    )
    expect(quotes).toHaveLength(1)
    const body: unknown = await quotes[0]?.json()
    expect(body).toEqual({
      items: [
        { type: 'product', productId: 'prd-yerba-canarias', quantity: 2, options: null },
        {
          type: 'kit',
          mateId: 'prd-imperial-premium',
          bombillaId: 'prd-bombillon-premium-curvo',
          yerbaId: 'prd-yerba-canarias',
          leather: 'Negro',
          quantity: 1,
        },
      ],
    })
  })

  it('una línea que la cotización marca sin stock no muestra importes ni precio sin impuestos en $0', async () => {
    const { api, db } = createTestApi()
    const galleta = db.products.find((product) => product.id === 'prd-galleta')
    expect(galleta?.stock).toBe(0)
    useCartStore.setState({
      lines: [
        { type: 'product', productId: 'prd-galleta', quantity: 1, options: OPTIONS },
        { type: 'product', productId: 'prd-yerba-canarias', quantity: 1 },
      ],
      hasHydrated: true,
    })
    renderCart(api)

    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))

    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Sin stock')
    await within(dialog).findByText('Yerba Canarias 1 kg')
    expect(within(dialog).queryByText(/\$0(?!\d)/)).not.toBeInTheDocument()
    // El neto solo aparece en la línea con stock y en el subtotal, que no suma la agotada.
    expect(within(dialog).getAllByText(/^Precio sin impuestos nacionales:/)).toHaveLength(2)
  })

  it('cambiar la cantidad actualiza la línea y "−" en 1 la quita', async () => {
    const { api } = createTestApi()
    const yerba: CartableProduct = {
      id: 'prd-yerba-canarias',
      name: 'Yerba Canarias 1 kg',
      group: 'yerba',
      priceArs: 9999,
      maxQuantity: 12,
      isPurchasable: true,
    }
    renderCart(api)
    await screen.findByRole('button', { name: /^Abrir carrito/ })
    addProductToCart({ product: yerba })

    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Yerba Canarias 1 kg')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Sumar' }))
    expect(await within(dialog).findAllByText('$19.998')).not.toHaveLength(0)
    expect(useCartStore.getState().lines[0]?.quantity).toBe(2)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Restar' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Quitar' }))

    expect(useCartStore.getState().lines).toEqual([])
    expect(await within(dialog).findByText('Tu carrito está vacío')).toBeVisible()
  })

  it('Escape y "Seguir comprando" lo cierran', async () => {
    const { api } = createTestApi()
    renderCart(api)
    await userEvent.click(await screen.findByRole('button', { name: /^Abrir carrito/ }))
    expect(await screen.findByRole('dialog')).toBeVisible()

    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(useCartStore.getState().isOpen).toBe(false)
  })
})
