// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductSummary } from '@galpon/api-client'
import type { ProductGridProps } from './ProductGrid'
import { PRODUCT_CARD_COPY } from './product-card.copy'
import { PRODUCT_GRID_CLASS, ProductGrid } from './ProductGrid'

// La tarjeta lleva a la ficha con el router de Next.
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

const installments = { maxWithoutInterest: 3, showOnProduct: true }

/** Producto para las pruebas. */
function product(index: number): ProductSummary {
  const number = String(index).padStart(2, '0')
  return {
    id: `prd-${number}`,
    categoryId: 'cat-imperiales',
    categoryName: 'Imperiales',
    categorySlug: 'imperiales',
    code: `N°${number}`,
    description: 'Descripción.',
    featured: false,
    group: 'mate',
    isPurchasable: true,
    isSoldOut: false,
    leathers: [],
    mainImage: null,
    maxQuantity: 10,
    name: `Mate ${number}`,
    netPriceArs: 24793,
    priceArs: 30000,
    rating: { average: 0, count: 0 },
    slug: `mate-${number}`,
  }
}

/** `count` productos numerados desde 1. */
function products(count: number): ProductSummary[] {
  return Array.from({ length: count }, (_, index) => product(index + 1))
}

/** Columnas que "mide" la grilla en las pruebas: lo que devuelve su `grid-template-columns`. */
const layout = { columns: 5 }

/** Avisos de cambio de tamaño de las grillas observadas, para simular un cambio de ancho. */
const resizeNotices: (() => void)[] = []

/** `ResizeObserver` de mentira: avisa al observar (como el real) y cuando la prueba lo pide. */
class FakeResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback
  }

  observe(): void {
    const notice = (): void => {
      this.#callback([], this)
    }
    resizeNotices.push(notice)
    notice()
  }

  unobserve(): void {
    return undefined
  }

  disconnect(): void {
    return undefined
  }
}

/** Avisa a las grillas observadas que cambió el ancho (con las columnas de `layout`). */
function resize(columns: number): void {
  layout.columns = columns
  act(() => {
    for (const notice of resizeNotices) notice()
  })
}

/** Los nombres de las tarjetas que se ven, en orden. */
function shownNames(): string[] {
  return screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
}

/** El botón "Ver más productos", si está. */
function moreButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: 'Ver más productos' })
}

/** El link del nombre de la tarjeta en la posición `position` (desde 1) de lo que se ve. */
function cardLink(position: number): HTMLElement {
  const heading = screen.queryAllByRole('heading', { level: 3 }).at(position - 1)
  if (heading === undefined) throw new Error(`No hay tarjeta en la posición ${String(position)}`)
  return within(heading).getByRole('link')
}

/** La grilla con 20 productos, 3 hileras, 5 columnas supuestas y lo que cambie cada prueba. */
function grid(overrides: Partial<ProductGridProps> = {}): ReactNode {
  return (
    <ProductGrid
      products={products(20)}
      rows={3}
      defaultColumns={5}
      moreLabel={PRODUCT_CARD_COPY.moreProducts}
      installments={installments}
      showNetPrice={false}
      {...overrides}
    />
  )
}

/** jsdom no tiene `scrollIntoView`: se usa al terminar de desplegar para acercar la tarjeta enfocada. */
const scrollIntoView = vi.fn()

/** Lo que había en `Element.prototype.scrollIntoView` antes de las pruebas (en jsdom, nada). */
const nativeScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')

/** Cambia `ResizeObserver` y `getComputedStyle` para que la grilla mida `layout.columns`. */
function installMeasuredGrid(): void {
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

beforeEach(() => {
  layout.columns = 5
  scrollIntoView.mockClear()
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: scrollIntoView,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resizeNotices.length = 0
  if (nativeScrollIntoView === undefined) {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  } else {
    Object.defineProperty(Element.prototype, 'scrollIntoView', nativeScrollIntoView)
  }
})

describe('PRODUCT_CARD_COPY', () => {
  it('el botón dice "Ver más productos" en la tienda, la ficha y el inicio', () => {
    expect(PRODUCT_CARD_COPY.moreProducts).toBe('Ver más productos')
  })
})

describe('ProductGrid con la grilla medida', () => {
  beforeEach(() => {
    installMeasuredGrid()
  })

  it('con 5 columnas y 3 hileras muestra 15 tarjetas y "Ver más productos"', () => {
    render(grid())
    expect(shownNames()).toHaveLength(15)
    expect(shownNames()[14]).toBe('Mate 15')
    expect(moreButton()).toBeInTheDocument()
  })

  it('el botón despliega el resto, desaparece y deja el foco en la primera nueva (la 16.ª)', async () => {
    const user = userEvent.setup()
    render(grid())
    const button = moreButton()
    if (button === null) throw new Error('Falta el botón')
    await user.click(button)
    expect(shownNames()).toHaveLength(20)
    expect(moreButton()).not.toBeInTheDocument()
    expect(cardLink(16)).toHaveFocus()
    await vi.waitFor(
      () => {
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
      },
      { timeout: 3000 },
    )
  })

  it('otro collapseKey la vuelve a plegar', async () => {
    const user = userEvent.setup()
    const { rerender } = render(grid({ collapseKey: 'a' }))
    const button = moreButton()
    if (button === null) throw new Error('Falta el botón')
    await user.click(button)
    expect(shownNames()).toHaveLength(20)
    rerender(grid({ collapseKey: 'b' }))
    expect(shownNames()).toHaveLength(15)
    expect(moreButton()).toBeInTheDocument()
  })

  it('las hileras siguen al ancho: con 4 columnas se ven 12', () => {
    render(grid())
    resize(4)
    expect(shownNames()).toHaveLength(12)
    expect(moreButton()).toBeInTheDocument()
  })

  it('con menos productos que las hileras completas no hay botón', () => {
    render(grid({ products: products(15) }))
    expect(shownNames()).toHaveLength(15)
    expect(moreButton()).not.toBeInTheDocument()
  })

  it('collapseMaxColumns={1}: con 2 columnas muestra todas y sin botón', () => {
    layout.columns = 2
    render(grid({ products: products(8), defaultColumns: 4, collapseMaxColumns: 1 }))
    expect(shownNames()).toHaveLength(8)
    expect(moreButton()).not.toBeInTheDocument()
  })

  it('collapseMaxColumns={1}: con 1 columna muestra 3 y el botón', () => {
    layout.columns = 1
    render(grid({ products: products(8), defaultColumns: 4, collapseMaxColumns: 1 }))
    expect(shownNames()).toHaveLength(3)
    expect(moreButton()).toBeInTheDocument()
  })

  it('collapseMaxColumns={1}: al pasar de 2 columnas a 1 se pliega', () => {
    layout.columns = 2
    render(grid({ products: products(8), defaultColumns: 4, collapseMaxColumns: 1 }))
    resize(1)
    expect(shownNames()).toHaveLength(3)
    expect(moreButton()).toBeInTheDocument()
  })

  it('dibuja la grilla de arriba en el marco que recibe, con su clase', () => {
    layout.columns = 1
    const className = `${PRODUCT_GRID_CLASS} min-[1440px]:grid-cols-4`
    render(
      grid({
        className,
        frame: ({ className: frameClass, children }) => (
          <section data-testid="frame" className={frameClass}>
            {children}
          </section>
        ),
      }),
    )
    const frame = screen.getByTestId('frame')
    expect(frame).toHaveClass('min-[1440px]:grid-cols-4')
    expect(within(frame).getAllByRole('heading', { level: 3 })).toHaveLength(3)
  })

  it('las tarjetas nuevas usan la misma clase de grilla que las de arriba', async () => {
    layout.columns = 1
    const user = userEvent.setup()
    const className = `${PRODUCT_GRID_CLASS} min-[1440px]:grid-cols-4`
    render(grid({ products: products(8), className }))
    const button = moreButton()
    if (button === null) throw new Error('Falta el botón')
    await user.click(button)
    const unfolded = cardLink(4).closest('[class*="grid-cols-"]')
    expect(unfolded).toHaveClass('min-[1440px]:grid-cols-4')
    expect(unfolded?.contains(cardLink(3))).toBe(false)
  })
})

describe('ProductGrid sin ResizeObserver', () => {
  it('usa defaultColumns: con 4 y 3 hileras muestra 12 y el botón', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    render(grid({ defaultColumns: 4 }))
    expect(shownNames()).toHaveLength(12)
    expect(moreButton()).toBeInTheDocument()
  })

  it('con collapseMaxColumns menor que defaultColumns muestra todas y sin botón', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    render(grid({ products: products(8), defaultColumns: 4, collapseMaxColumns: 1 }))
    expect(shownNames()).toHaveLength(8)
    expect(moreButton()).not.toBeInTheDocument()
  })
})

describe('ProductGrid: validación', () => {
  it.each<[string, Partial<ProductGridProps>]>([
    ['hileras', { rows: 0 }],
    ['columnas por omisión', { defaultColumns: 2.5 }],
    ['tope de columnas para plegar', { collapseMaxColumns: 0 }],
    ['tarjetas con prioridad', { priorityCount: -1 }],
  ])('rechaza %s inválidas con un RangeError', (_, overrides) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(grid(overrides))).toThrow(RangeError)
  })
})
