// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RelatedProducts } from './RelatedProducts'
import { summary } from './test/support'

// La tarjeta lleva a la ficha con el router de Next.
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

const settings = {
  installments: { maxWithoutInterest: 3, showOnProduct: true },
  priceDisplay: { showNetPrice: true },
}

/** 20 relacionados numerados desde 1. */
const related = Array.from({ length: 20 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return summary({ id: `rel-${number}`, name: `Relacionado ${number}` })
})

/** Lo que había en `Element.prototype.scrollIntoView` antes de las pruebas (en jsdom, nada). */
const nativeScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')

// jsdom no tiene `scrollIntoView`: la grilla lo usa al terminar de desplegar.
beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  if (nativeScrollIntoView === undefined) {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  } else {
    Object.defineProperty(Element.prototype, 'scrollIntoView', nativeScrollIntoView)
  }
})

/** La sección "Más para la ronda". */
function section(): HTMLElement {
  const title = screen.getByRole('heading', { level: 2, name: 'Más para la ronda' })
  const host = title.closest('section')
  if (host === null) throw new Error('Falta la sección de relacionados')
  return host
}

/** Los títulos de las tarjetas de la sección. */
function cardHeadings(): HTMLElement[] {
  return within(section()).queryAllByRole('heading', { level: 3 })
}

describe('RelatedProducts', () => {
  it('va en el contenedor angosto de la tienda (5 tarjetas por hilera)', () => {
    render(<RelatedProducts products={related} settings={settings} />)
    expect(section()).toHaveClass('shop-container')
    expect(section()).not.toHaveClass('site-container')
  })

  it('con 20 relacionados muestra 3 hileras de 5 (15) y "Ver más productos"; al tocarlo, los 20', async () => {
    const user = userEvent.setup()
    render(<RelatedProducts products={related} settings={settings} />)
    expect(cardHeadings()).toHaveLength(15)
    await user.click(within(section()).getByRole('button', { name: 'Ver más productos' }))
    expect(cardHeadings()).toHaveLength(20)
    expect(within(section()).queryByRole('button', { name: 'Ver más productos' })).toBeNull()
    const sixteenth = cardHeadings()[15]
    if (sixteenth === undefined) throw new Error('Falta la 16.ª tarjeta')
    expect(within(sixteenth).getByRole('link')).toHaveFocus()
  })

  it('con 15 o menos no hay botón', () => {
    render(<RelatedProducts products={related.slice(0, 15)} settings={settings} />)
    expect(cardHeadings()).toHaveLength(15)
    expect(screen.queryByRole('button', { name: 'Ver más productos' })).toBeNull()
  })

  it('sin productos no dibuja nada', () => {
    const { container } = render(<RelatedProducts products={[]} settings={settings} />)
    expect(container).toBeEmptyDOMElement()
  })
})
