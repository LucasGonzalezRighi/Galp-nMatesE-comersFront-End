// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { OrderLine } from '@galpon/api-client'
import { OrderLines } from './OrderLines'

afterEach(cleanup)

/** Un mate suelto y un kit, como los devuelve la API. */
const LINES: OrderLine[] = [
  {
    type: 'product',
    name: 'Mate Imperial Premium',
    detail: 'Cuero Negro · Virola Alpaca cincelada',
    productSlug: 'mate-imperial-premium',
    options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
    kitItems: null,
    quantity: 2,
    unitPriceArs: 39999,
    kitSavingsArs: 0,
    totalArs: 79998,
  },
  {
    type: 'kit',
    name: 'Kit',
    detail: 'Cuero Negro',
    productSlug: null,
    options: { leather: 'Negro', ferrule: 'Alpaca lisa' },
    kitItems: [
      { name: 'Mate Galleta', slug: 'mate-galleta', unitPriceArs: 25000 },
      { name: 'Bombilla Pico de Loro', slug: 'bombilla-pico-de-loro', unitPriceArs: 12000 },
      { name: 'Yerba Suave', slug: 'yerba-suave', unitPriceArs: 3000 },
    ],
    quantity: 1,
    unitPriceArs: 40000,
    kitSavingsArs: 4000,
    totalArs: 36000,
  },
]

describe('OrderLines', () => {
  it('muestra cada línea con su detalle, cantidad, precio unitario y total', () => {
    render(<OrderLines lines={LINES} />)

    const [mate, kit] = screen.getAllByRole('listitem')
    if (mate === undefined || kit === undefined) throw new Error('Faltan líneas')
    expect(within(mate).getByText('Mate Imperial Premium')).toBeInTheDocument()
    expect(within(mate).getByText('Cuero Negro · Virola Alpaca cincelada')).toBeInTheDocument()
    expect(within(mate).getByText('2 × $39.999')).toBeInTheDocument()
    expect(within(mate).getByText('$79.998')).toBeInTheDocument()
    expect(
      within(kit).getByText('Mate Galleta + Bombilla Pico de Loro + Yerba Suave'),
    ).toBeInTheDocument()
    expect(within(kit).getByText('Ahorrás $4.000')).toBeInTheDocument()
    expect(within(kit).getByText('$36.000')).toBeInTheDocument()
  })
})
