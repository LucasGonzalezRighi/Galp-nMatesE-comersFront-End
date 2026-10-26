// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCart, useCart } from '../cart'
import { hideToast } from '../toast'
import { ProductPurchase } from './ProductPurchase'
import { detail } from './test/support'

/** Navegación simulada: "Comprar ahora" lleva al checkout con el router de Next. */
const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => router,
}))

const CONTACT_EMAIL = 'galpon.mates@gmail.com'

/** Muestra las líneas del carrito (por la API pública de la feature, como cualquier pantalla). */
function CartProbe(): ReactNode {
  return <pre data-testid="cart-lines">{JSON.stringify(useCart().lines)}</pre>
}

/** Las líneas del carrito que muestra `CartProbe`. */
function cartLines(): unknown {
  return JSON.parse(screen.getByTestId('cart-lines').textContent)
}

/** Dibuja la compra de un producto junto con el carrito. */
function renderPurchase(product: ReturnType<typeof detail>): void {
  render(
    <>
      <ProductPurchase product={product} contactEmail={CONTACT_EMAIL} />
      <CartProbe />
    </>,
  )
}

beforeEach(() => {
  router.push.mockReset()
  act(() => {
    clearCart()
  })
})

afterEach(() => {
  act(() => {
    hideToast()
  })
  cleanup()
})

describe('opciones del mate', () => {
  it('un mate ofrece el cuero (cuatro muestras) y la virola (tres opciones)', () => {
    renderPurchase(detail())

    const leathers = screen.getByRole('group', { name: 'Cuero' })
    expect(leathers.querySelectorAll('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Negro', pressed: true })).toBeInTheDocument()
    const ferrules = screen.getByRole('radiogroup', { name: 'Virola' })
    expect(within(ferrules).getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Alpaca cincelada', checked: true })).toBeVisible()
  })

  it('una bombilla o una yerba no ofrece cuero ni virola', () => {
    for (const group of ['bombilla', 'yerba'] as const) {
      renderPurchase(detail({ group, options: null }))
      expect(screen.queryByRole('group', { name: 'Cuero' })).toBeNull()
      expect(screen.queryByRole('radiogroup', { name: 'Virola' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeVisible()
      cleanup()
    }
  })

  it('lo que se elige viaja al carrito junto con el mate', async () => {
    const user = userEvent.setup()
    renderPurchase(detail())

    await user.click(screen.getByRole('button', { name: 'Borravino' }))
    await user.click(screen.getByRole('radio', { name: 'Acero' }))
    await user.click(screen.getByRole('button', { name: 'Agregar al carrito' }))

    expect(cartLines()).toEqual([
      {
        type: 'product',
        productId: 'prd-imperial-premium',
        quantity: 1,
        options: { leather: 'Borravino', ferrule: 'Acero' },
      },
    ])
  })

  it('una bombilla se agrega sin opciones', async () => {
    const user = userEvent.setup()
    renderPurchase(detail({ id: 'prd-bombillon', group: 'bombilla', options: null }))

    await user.click(screen.getByRole('button', { name: 'Agregar al carrito' }))

    expect(cartLines()).toEqual([{ type: 'product', productId: 'prd-bombillon', quantity: 1 }])
  })
})

describe('compra', () => {
  it('suma la cantidad elegida sin pasar del stock', async () => {
    const user = userEvent.setup()
    renderPurchase(detail({ maxQuantity: 3 }))

    const increase = screen.getByRole('button', { name: 'Sumar' })
    await user.click(increase)
    await user.click(increase)
    await user.click(increase)
    await user.click(screen.getByRole('button', { name: 'Agregar al carrito' }))

    expect(cartLines()).toMatchObject([{ quantity: 3 }])
  })

  it('un doble clic rápido en "Agregar al carrito" nunca supera el tope', async () => {
    const user = userEvent.setup()
    renderPurchase(detail({ maxQuantity: 2 }))

    const add = screen.getByRole('button', { name: 'Agregar al carrito' })
    await user.tripleClick(add)

    expect(cartLines()).toMatchObject([{ quantity: 2 }])
    expect(add).toBeDisabled()
  })

  it('"Comprar ahora" agrega el producto y va al checkout', async () => {
    const user = userEvent.setup()
    renderPurchase(detail())

    await user.click(screen.getByRole('button', { name: 'Comprar ahora' }))

    expect(cartLines()).toMatchObject([{ productId: 'prd-imperial-premium', quantity: 1 }])
    expect(router.push).toHaveBeenCalledWith('/checkout')
  })
})

describe('producto que no se puede comprar', () => {
  it.each([
    ['sin precio', { priceArs: null, netPriceArs: null, isPurchasable: false }],
    ['sin stock', { isSoldOut: true, isPurchasable: false, maxQuantity: 0 }],
  ])('%s muestra "Consultar por mail" con el asunto "Consulta: {nombre}"', (_name, overrides) => {
    renderPurchase(detail({ name: 'Mate Imperial Premium', ...overrides }))

    const link = screen.getByRole('link', { name: 'Consultar por mail' })
    const href = link.getAttribute('href') ?? ''
    expect(href.startsWith(`mailto:${CONTACT_EMAIL}?`)).toBe(true)
    const subject = new URL(href).searchParams.get('subject')
    expect(subject).toBe('Consulta: Mate Imperial Premium')
    expect(screen.queryByRole('button', { name: 'Agregar al carrito' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Comprar ahora' })).toBeNull()
  })

  it('el asunto codifica los caracteres especiales del nombre', () => {
    renderPurchase(detail({ name: 'Té & Mate "Ñandú"', isPurchasable: false }))

    const href = screen.getByRole('link', { name: 'Consultar por mail' }).getAttribute('href') ?? ''
    expect(new URL(href).searchParams.get('subject')).toBe('Consulta: Té & Mate "Ñandú"')
  })

  it('un mate sin precio igual muestra sus opciones', () => {
    renderPurchase(detail({ priceArs: null, netPriceArs: null, isPurchasable: false }))

    expect(screen.getByRole('group', { name: 'Cuero' })).toBeVisible()
    expect(screen.getByRole('radiogroup', { name: 'Virola' })).toBeVisible()
  })
})
