// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductSummary } from '@galpon/api-client'
import { cleanUpAfterEach } from '../../components/motion/test/support'
import { FeaturedGrid } from './FeaturedGrid'
import { buildHomeData } from './home-data'
import { loadFixtureCatalog } from './test/fixture-catalog'

// La tarjeta lleva a la ficha con el router de Next.
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

cleanUpAfterEach()

const installments = { maxWithoutInterest: 3, showOnProduct: true }

/** Los destacados del inicio con el catálogo de fábrica (8). */
let featured: ProductSummary[] = []

beforeAll(async () => {
  featured = buildHomeData(await loadFixtureCatalog()).featured
})

/** Columnas que "mide" la grilla en las pruebas: lo que devuelve su `grid-template-columns`. */
const layout = { columns: 1 }

/** `ResizeObserver` de mentira: avisa apenas empieza a observar, como el real. */
class FakeResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
  }

  observe(): void {
    this.#callback([], this)
  }

  unobserve(): void {
    return undefined
  }

  disconnect(): void {
    return undefined
  }
}

/** Cambia `ResizeObserver` y `getComputedStyle` para que la grilla mida `layout.columns`. */
function installMeasuredGrid(columns: number): void {
  layout.columns = columns
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  const computed = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = computed(element, pseudo)
    if (element instanceof HTMLElement && element.className.includes('grid-cols-')) {
      Object.defineProperty(style, 'gridTemplateColumns', {
        value: Array.from({ length: layout.columns }, () => '250px').join(' '),
      })
    }
    return style
  })
}

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
  if (nativeScrollIntoView === undefined) {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  } else {
    Object.defineProperty(Element.prototype, 'scrollIntoView', nativeScrollIntoView)
  }
})

/** Dibuja los destacados de fábrica. */
function renderFeatured(): void {
  render(<FeaturedGrid products={featured} installments={installments} showNetPrice={false} />)
}

/** Los títulos de las tarjetas que se ven. */
function cardHeadings(): HTMLElement[] {
  return screen.queryAllByRole('heading', { level: 3 })
}

/** El botón "Ver más productos", si está. */
function moreButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: 'Ver más productos' })
}

describe('FeaturedGrid', () => {
  it('el catálogo de fábrica tiene 8 destacados', () => {
    expect(featured).toHaveLength(8)
  })

  it('con 1 columna (celular) muestra 3 y el botón; al tocarlo, las 8 y el foco en la 4.ª', async () => {
    installMeasuredGrid(1)
    const user = userEvent.setup()
    renderFeatured()
    expect(cardHeadings()).toHaveLength(3)
    const button = moreButton()
    if (button === null) throw new Error('Falta el botón')
    await user.click(button)
    expect(cardHeadings()).toHaveLength(8)
    expect(moreButton()).not.toBeInTheDocument()
    const fourth = cardHeadings()[3]
    if (fourth === undefined) throw new Error('Falta la 4.ª tarjeta')
    expect(within(fourth).getByRole('link')).toHaveFocus()
  })

  it('con 2 columnas (tableta) muestra las 8 sin botón', () => {
    installMeasuredGrid(2)
    renderFeatured()
    expect(cardHeadings()).toHaveLength(8)
    expect(moreButton()).not.toBeInTheDocument()
  })

  it('sin ResizeObserver (el HTML del servidor) muestra las 8 sin botón', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    renderFeatured()
    expect(cardHeadings()).toHaveLength(8)
    expect(moreButton()).not.toBeInTheDocument()
  })

  it('la grilla sigue siendo auto-fill y de hasta 4 columnas desde 1440 px', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    renderFeatured()
    const first = cardHeadings()[0]
    const grid = first?.closest('[class*="auto-fill"]')
    expect(grid).toHaveClass('min-[1440px]:grid-cols-4')
  })
})
