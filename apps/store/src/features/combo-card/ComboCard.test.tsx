// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Combo } from '@galpon/api-client'
import { createApiClient, listCombos } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import {
  installIntersectionObserver,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { clearCart, useCart } from '../cart'
import { hideToast, Toaster } from '../toast'
import { ComboCard } from './ComboCard'

const installments = { maxWithoutInterest: 3, showOnProduct: true }

/** Los combos a la venta de la base simulada de fábrica, como los trae `GET /combos`. */
async function fixtureCombos(): Promise<Combo[]> {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  return await listCombos(createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch }))
}

/** Un combo de fábrica por nombre. */
async function fixtureCombo(name: string): Promise<Combo> {
  const combo = (await fixtureCombos()).find((candidate) => candidate.name === name)
  if (combo === undefined) throw new Error(`Falta el combo de fábrica "${name}".`)
  return combo
}

/** Muestra las líneas del carrito (por la API pública de la feature). */
function CartProbe(): ReactNode {
  return <pre data-testid="cart-lines">{JSON.stringify(useCart().lines)}</pre>
}

/** Las líneas del carrito que muestra `CartProbe`. */
function cartLines(): unknown {
  return JSON.parse(screen.getByTestId('cart-lines').textContent)
}

/** Dibuja tarjetas con los ajustes de fábrica, el aviso y el carrito. */
function renderCards(combos: readonly Combo[]): void {
  render(
    <>
      {combos.map((combo, index) => (
        <ComboCard
          key={combo.id}
          combo={combo}
          installments={installments}
          showNetPrice={false}
          index={index}
        />
      ))}
      <Toaster />
      <CartProbe />
    </>,
  )
}

/** La tarjeta (el `article`) de un combo por su nombre. */
function card(name: string): HTMLElement {
  return screen.getByRole('article', { name })
}

beforeEach(() => {
  mockReducedMotion(true)
  installIntersectionObserver()
  localStorage.clear()
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

describe('ComboCard', () => {
  it('muestra el nombre, las piezas con su ficha y su precio, el precio final, el de lista tachado y el ahorro', async () => {
    renderCards([await fixtureCombo('Dúo Imperial')])

    const article = card('Dúo Imperial')
    expect(within(article).getByRole('heading', { level: 3 })).toHaveTextContent('Dúo Imperial')
    expect(article).toHaveTextContent('Combo')
    expect(article).toHaveTextContent('2 piezas')
    const pieces = within(article).getByRole('list', { name: 'Piezas del combo' })
    const links = within(pieces).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Mate Imperial Premium',
      'Bombillón Premium Curvo',
    ])
    expect(links[0]).toHaveAttribute('href', '/producto/mate-imperial-premium')
    expect(pieces).toHaveTextContent('$39.999')
    expect(pieces).toHaveTextContent('$28.999')
    expect(within(article).getByText('Precio del combo:')).toHaveClass('sr-only')
    expect(within(article).getByText('$61.999')).toBeInTheDocument()
    const list = within(article).getByText('$68.998')
    expect(list.tagName).toBe('S')
    expect(within(article).getByText('Ahorrás $6.999')).toBeInTheDocument()
    // Las fotos de las piezas, con el "+" entre una y otra (decorativo).
    expect(article.querySelectorAll('[data-combo-piece]')).toHaveLength(2)
    expect(article.querySelectorAll('[data-combo-plus]')).toHaveLength(1)
  })

  it('el cuero aparece solo si el combo lleva mate, con Negro elegido y sin virola', async () => {
    renderCards([await fixtureCombo('Dúo Imperial'), await fixtureCombo('Bombilla y yerba')])

    const duo = card('Dúo Imperial')
    const leathers = within(duo).getByRole('group', { name: 'Cuero del Mate Imperial Premium' })
    expect(within(leathers).getAllByRole('button')).toHaveLength(4)
    expect(within(leathers).getByRole('button', { name: 'Negro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(duo).queryByRole('radiogroup')).toBeNull()
    expect(duo).not.toHaveTextContent('Virola')

    const withoutMate = card('Bombilla y yerba')
    expect(within(withoutMate).queryByRole('group', { name: /^Cuero/ })).toBeNull()
    expect(within(withoutMate).queryByRole('radiogroup')).toBeNull()
  })

  it('agrega el combo con el cuero elegido, avisa y no abre el carrito', async () => {
    renderCards([await fixtureCombo('Dúo Imperial')])
    const duo = card('Dúo Imperial')

    await userEvent.click(within(duo).getByRole('button', { name: 'Marrón' }))
    await userEvent.click(
      within(duo).getByRole('button', { name: 'Agregar combo Dúo Imperial al carrito' }),
    )

    expect(cartLines()).toEqual([
      {
        type: 'combo',
        comboId: 'cmb-duo-imperial',
        productIds: ['prd-imperial-premium', 'prd-bombillon-premium-curvo'],
        options: { leather: 'Marrón' },
        quantity: 1,
      },
    ])
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
      'Combo agregado al carrito. Dúo Imperial',
    )
  })

  it('sin stock: etiqueta "Sin stock", la pieza agotada sin precio, opciones y botón deshabilitados', async () => {
    const duo = await fixtureCombo('Dúo Imperial')
    const [mate, bombilla] = duo.items
    if (mate === undefined || bombilla === undefined) throw new Error('Faltan piezas.')
    renderCards([
      {
        ...duo,
        isPurchasable: false,
        isSoldOut: true,
        maxQuantity: 0,
        items: [mate, { ...bombilla, maxQuantity: 0, isPurchasable: false }],
      },
    ])

    const article = card('Dúo Imperial')
    const button = within(article).getByRole('button', { name: 'Sin stock: Dúo Imperial' })
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Sin stock')
    const pieces = within(article).getByRole('list', { name: 'Piezas del combo' })
    expect(pieces).not.toHaveTextContent('$28.999')
    expect(within(pieces).getByText('Sin stock')).toBeInTheDocument()
    expect(within(article).getByRole('button', { name: 'Negro' })).toBeDisabled()
  })

  it('con todo lo disponible de una pieza en el carrito, el botón se deshabilita y explica por qué', async () => {
    const duo = await fixtureCombo('Dúo Imperial')
    const limited = { ...duo, items: duo.items.map((item) => ({ ...item, maxQuantity: 1 })) }
    renderCards([limited])
    const add = screen.getByRole('button', { name: 'Agregar combo Dúo Imperial al carrito' })

    await userEvent.click(add)

    expect(add).toBeDisabled()
    expect(add).toHaveAttribute('title', 'Ya tenés el máximo disponible en el carrito')
  })

  it('sin ahorro no muestra el precio tachado ni el chip', async () => {
    const duo = await fixtureCombo('Dúo Imperial')
    renderCards([{ ...duo, listPriceArs: duo.priceArs, savingsArs: 0 }])

    const article = card('Dúo Imperial')
    expect(article.querySelector('s')).toBeNull()
    expect(within(article).queryByText(/^Ahorrás/)).toBeNull()
    expect(within(article).queryByText('Precio de lista:')).toBeNull()
  })

  it('con los combos de fábrica, cada botón y cada grupo de cueros tiene un nombre propio', async () => {
    const combos = await fixtureCombos()
    renderCards(combos)

    const names = (elements: HTMLElement[]): string[] =>
      elements.map((element) => element.getAttribute('aria-label') ?? '')
    const buttons = names(screen.getAllByRole('button', { name: /^Agregar combo/ }))
    const groups = names(screen.getAllByRole('group', { name: /^Cuero del/ }))
    expect(buttons).toHaveLength(combos.length)
    expect(new Set(buttons).size).toBe(buttons.length)
    expect(new Set(groups).size).toBe(groups.length)
  })
})
