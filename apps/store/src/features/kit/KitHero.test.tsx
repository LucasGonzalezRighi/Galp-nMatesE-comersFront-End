// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { KitHero } from './KitHero'

afterEach(cleanup)

describe('KitHero', () => {
  it('con descuento, la bajada lo cuenta con el signo menos del diseño', () => {
    render(<KitHero discountPercent={10} />)

    expect(
      screen.getByText(
        'Elegí mate, bombilla y yerba. Con las tres piezas, el kit tiene −10% sobre el total.',
      ),
    ).toBeInTheDocument()
  })

  it('sin descuento (0%) omite la frase del descuento y no dice "−0%"', () => {
    render(<KitHero discountPercent={0} />)

    expect(screen.getByText('Elegí mate, bombilla y yerba.')).toBeInTheDocument()
    expect(screen.queryByText(/0%/)).toBeNull()
  })

  it('rechaza un descuento fuera de rango', () => {
    expect(() => render(<KitHero discountPercent={101} />)).toThrow(RangeError)
  })
})
