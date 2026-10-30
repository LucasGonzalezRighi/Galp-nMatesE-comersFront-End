// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, ProductSummary } from '@galpon/api-client'
import type { CatalogSettings } from './CatalogView'
import { buildCatalogScope } from './catalog-scope'
import { CatalogBrowser } from './CatalogBrowser'

/** Búsqueda de la dirección que ve el catálogo (la de `useSearchParams`): cada prueba la cambia. */
const navigation = vi.hoisted(() => ({ search: '' }))

vi.mock('next/navigation', () => ({
  useSearchParams: (): URLSearchParams => new URLSearchParams(navigation.search),
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

/** Línea de producto para las pruebas. */
function category(slug: string, name: string, position: number): Category {
  return {
    id: `cat-${slug}`,
    slug,
    name,
    blurb: `Bajada de ${name}.`,
    group: 'mate',
    image: null,
    position,
    productCount: 0,
  }
}

/** Producto para las pruebas. */
function product(
  id: string,
  name: string,
  categorySlug: string,
  priceArs: number | null,
  overrides: Partial<ProductSummary> = {},
): ProductSummary {
  return {
    id,
    categoryId: `cat-${categorySlug}`,
    categoryName: categorySlug,
    categorySlug,
    code: 'N°01',
    description: 'Descripción.',
    featured: false,
    group: 'mate',
    isPurchasable: priceArs !== null,
    isSoldOut: false,
    mainImage: null,
    maxQuantity: 10,
    name,
    netPriceArs: priceArs === null ? null : Math.round(priceArs / 1.21),
    priceArs,
    rating: { average: 0, count: 0 },
    slug: id,
    ...overrides,
  }
}

const categories = [
  category('imperiales', 'Imperiales', 1),
  category('torpedos', 'Torpedos', 2),
  category('bombillones', 'Bombillones', 3),
  category('yerbas', 'Yerbas', 4),
  category('camioneros', 'Camioneros', 5),
]

const products = [
  product('imperial-premium', 'Mate Imperial Premium', 'imperiales', 39999, { featured: true }),
  product('torpedo-premium', 'Mate Torpedo Premium', 'torpedos', 39999),
  product('bombillon-curvo', 'Bombillón Curvo', 'bombillones', 28999),
  product('bombillon-alpaca', 'Bombillón 100% Alpaca', 'bombillones', 25999, { featured: true }),
  product('yerba-serena', 'Yerba Canarias Serena 1 kg', 'yerbas', 12500),
  product('torpedo-acero', 'Mate Torpedo Línea Acero', 'torpedos', null),
]

const settings: CatalogSettings = {
  installments: { maxWithoutInterest: 3, showOnProduct: true },
  showNetPrice: true,
  kitDiscountPercent: 10,
}

/** El catálogo de una línea (o de todo, sin línea) con los datos de la prueba. */
function catalogElement(
  lineSlug: string | null = null,
  overrides: { products?: ProductSummary[]; settings?: CatalogSettings } = {},
): ReactNode {
  const scope = buildCatalogScope(categories, overrides.products ?? products, lineSlug)
  if (scope === null) throw new Error('La línea de la prueba no existe')
  return <CatalogBrowser scope={scope} settings={overrides.settings ?? settings} />
}

/** Dibuja el catálogo de una línea (o de todo, sin línea) con los datos de la prueba. */
function renderCatalog(
  lineSlug: string | null = null,
  overrides: { products?: ProductSummary[]; settings?: CatalogSettings } = {},
): ReturnType<typeof render> {
  return render(catalogElement(lineSlug, overrides))
}

/** Los nombres de los productos que se ven, en orden. */
function shownNames(): string[] {
  return screen.queryAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
}

/** El buscador. */
function searchBox(): HTMLInputElement {
  return screen.getByRole<HTMLInputElement>('searchbox', { name: 'Buscar en la tienda' })
}

/** La lista de orden. */
function sortSelect(): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>('combobox', { name: 'Ordenar' })
}

beforeEach(() => {
  navigation.search = ''
  window.history.replaceState(null, '', '/tienda')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('CatalogBrowser: todo el catálogo', () => {
  it('muestra el título, la bajada, el contador y todos los productos con los destacados primero', () => {
    renderCatalog()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Todo el catálogo')
    expect(
      screen.getByText('Mates, bombillones y yerba. Elegí, sumá al carrito y pagá online.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('6 piezas')
    expect(shownNames()).toEqual([
      'Mate Imperial Premium',
      'Bombillón 100% Alpaca',
      'Mate Torpedo Premium',
      'Bombillón Curvo',
      'Yerba Canarias Serena 1 kg',
      'Mate Torpedo Línea Acero',
    ])
  })

  it('arma los botones de línea con su cantidad y marca "Todos" como el activo', () => {
    renderCatalog()
    const nav = screen.getByRole('navigation', { name: 'Líneas de producto' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Todos 6',
      'Imperiales 1',
      'Torpedos 2',
      'Bombillones 2',
      'Yerbas 1',
      'Camioneros 0',
    ])
    expect(within(nav).getByRole('link', { name: 'Todos 6' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Todos 6' })).toHaveAttribute('href', '/tienda')
    expect(within(nav).getByRole('link', { name: 'Torpedos 2' })).toHaveAttribute(
      'href',
      '/tienda/torpedos',
    )
    expect(within(nav).getByRole('link', { name: 'Torpedos 2' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('ofrece los cuatro órdenes del diseño', () => {
    renderCatalog()
    expect(
      within(sortSelect())
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Destacados', 'Menor precio', 'Mayor precio', 'A – Z'])
  })

  it('cierra con la banda hacia el kit y el descuento de los ajustes', () => {
    renderCatalog()
    expect(screen.getByText('¿Ya elegiste el mate? Sumale bombilla y yerba.')).toBeInTheDocument()
    expect(screen.getByText('Armando el kit tenés −10% sobre el total.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Armar mi kit' })).toHaveAttribute('href', '/kit')
  })

  it('con descuento 0 la banda no nombra el descuento', () => {
    renderCatalog(null, { settings: { ...settings, kitDiscountPercent: 0 } })
    expect(screen.queryByText(/Armando el kit/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Armar mi kit' })).toBeInTheDocument()
  })
})

describe('CatalogBrowser: una línea', () => {
  it('muestra el nombre y la bajada de la línea, solo sus productos y marca su botón', () => {
    renderCatalog('bombillones')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bombillones')
    expect(screen.getByText('Bajada de Bombillones.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('2 piezas')
    expect(shownNames()).toEqual(['Bombillón 100% Alpaca', 'Bombillón Curvo'])
    const nav = screen.getByRole('navigation', { name: 'Líneas de producto' })
    expect(within(nav).getByRole('link', { name: 'Bombillones 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Todos 6' })).not.toHaveAttribute('aria-current')
  })

  it('una línea sin productos muestra el aviso y el link a toda la tienda', () => {
    renderCatalog('camioneros')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Camioneros')
    expect(screen.getByText('Todavía no hay piezas en esta línea.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver toda la tienda' })).toHaveAttribute(
      'href',
      '/tienda',
    )
    expect(screen.getByRole('status')).toHaveTextContent('0 piezas')
    expect(shownNames()).toEqual([])
  })

  it('un catálogo sin productos lo dice, sin el link', () => {
    renderCatalog(null, { products: [] })
    expect(screen.getByText('Todavía no hay piezas en la tienda.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver toda la tienda' })).not.toBeInTheDocument()
  })
})

describe('CatalogBrowser: búsqueda y orden', () => {
  it('filtra al escribir, sin importar acentos ni mayúsculas, y actualiza el contador', async () => {
    const user = userEvent.setup()
    renderCatalog()
    await user.type(searchBox(), 'BOMBILLON')
    expect(shownNames()).toEqual(['Bombillón 100% Alpaca', 'Bombillón Curvo'])
    expect(screen.getByRole('status')).toHaveTextContent('2 piezas')
  })

  it('combina el filtro con el orden: menor precio, mayor precio y A–Z', async () => {
    const user = userEvent.setup()
    renderCatalog()
    await user.type(searchBox(), 'mate')
    await user.selectOptions(sortSelect(), 'menor')
    expect(shownNames()).toEqual([
      'Mate Imperial Premium',
      'Mate Torpedo Premium',
      'Mate Torpedo Línea Acero',
    ])
    await user.selectOptions(sortSelect(), 'az')
    expect(shownNames()).toEqual([
      'Mate Imperial Premium',
      'Mate Torpedo Línea Acero',
      'Mate Torpedo Premium',
    ])
    await user.clear(searchBox())
    await user.type(searchBox(), 'bombillon')
    await user.selectOptions(sortSelect(), 'mayor')
    expect(shownNames()).toEqual(['Bombillón Curvo', 'Bombillón 100% Alpaca'])
  })

  it('con "Menor precio" las piezas a consultar quedan al final', async () => {
    const user = userEvent.setup()
    renderCatalog()
    await user.selectOptions(sortSelect(), 'menor')
    expect(shownNames().at(-1)).toBe('Mate Torpedo Línea Acero')
    expect(shownNames()[0]).toBe('Yerba Canarias Serena 1 kg')
  })

  it('dentro de una línea la búsqueda solo mira esa línea', async () => {
    const user = userEvent.setup()
    renderCatalog('torpedos')
    await user.type(searchBox(), 'bombillon')
    expect(screen.getByText('No encontramos resultados para “bombillon”.')).toBeInTheDocument()
    await user.clear(searchBox())
    await user.type(searchBox(), 'acero')
    expect(shownNames()).toEqual(['Mate Torpedo Línea Acero'])
  })

  it('sin coincidencias muestra el mensaje y "Limpiar búsqueda" la borra', async () => {
    const user = userEvent.setup()
    renderCatalog()
    await user.type(searchBox(), 'zzz')
    expect(screen.getByText('No encontramos resultados para “zzz”.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 piezas')
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }))
    expect(searchBox()).toHaveValue('')
    expect(shownNames()).toHaveLength(6)
    expect(screen.queryByText(/No encontramos resultados/)).not.toBeInTheDocument()
  })

  it('una búsqueda escrita con etiquetas se muestra como texto, no como HTML', async () => {
    const user = userEvent.setup()
    const { container } = renderCatalog()
    await user.type(searchBox(), '<script>alert(1)</script>')
    const message = screen.getByText('No encontramos resultados para “<script>alert(1)</script>”.')
    expect(message.innerHTML).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(container.querySelector('script')).toBeNull()
  })
})

describe('CatalogBrowser: la dirección', () => {
  it('toma la búsqueda y el orden de ?q=&orden= al abrir', () => {
    navigation.search = '?q=bombill%C3%B3n&orden=mayor'
    renderCatalog()
    expect(searchBox()).toHaveValue('bombillón')
    expect(sortSelect()).toHaveValue('mayor')
    expect(shownNames()).toEqual(['Bombillón Curvo', 'Bombillón 100% Alpaca'])
  })

  it('un orden desconocido en la dirección vuelve a destacados', () => {
    navigation.search = '?orden=baratos'
    renderCatalog()
    expect(sortSelect()).toHaveValue('destacados')
    expect(shownNames()[0]).toBe('Mate Imperial Premium')
  })

  it('?q= con etiquetas y emojis se muestra como texto', () => {
    const rare = '<script>alert(1)</script> \u{1F9C9}'
    navigation.search = `?q=${encodeURIComponent(rare)}`
    const { container } = renderCatalog()
    expect(searchBox()).toHaveValue(rare)
    expect(screen.getByText(`No encontramos resultados para “${rare}”.`)).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
  })

  it('los botones de línea conservan la búsqueda y el orden', () => {
    navigation.search = '?q=mate&orden=az'
    renderCatalog()
    const nav = screen.getByRole('navigation', { name: 'Líneas de producto' })
    expect(within(nav).getByRole('link', { name: /^Torpedos/ })).toHaveAttribute(
      'href',
      '/tienda/torpedos?q=mate&orden=az',
    )
    expect(within(nav).getByRole('link', { name: /^Todos/ })).toHaveAttribute(
      'href',
      '/tienda?q=mate&orden=az',
    )
  })

  it('no escribe en la dirección mientras se busca (si cambiara, PageEnter animaría toda la página)', () => {
    vi.useFakeTimers()
    const replaceState = vi.spyOn(window.history, 'replaceState')
    renderCatalog()
    fireEvent.change(searchBox(), { target: { value: 'yerba' } })
    fireEvent.change(sortSelect(), { target: { value: 'az' } })
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(replaceState).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')
    expect(shownNames()).toEqual(['Yerba Canarias Serena 1 kg'])
    replaceState.mockRestore()
  })

  it('un cambio de dirección de afuera (la búsqueda del encabezado) reemplaza lo que se ve', async () => {
    const user = userEvent.setup()
    const { rerender } = renderCatalog()
    await user.type(searchBox(), 'mate')
    navigation.search = '?q=yerba&orden=az'
    rerender(catalogElement())
    expect(searchBox()).toHaveValue('yerba')
    expect(sortSelect()).toHaveValue('az')
    expect(shownNames()).toEqual(['Yerba Canarias Serena 1 kg'])
  })
})

/** Columnas que "mide" la grilla en las pruebas: lo que devuelve su `grid-template-columns`. */
const layout = { columns: 6 }

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

/** 27 productos: 19 mates imperiales y 8 bombillones (una línea de 8 no llega a 4 hileras). */
const manyProducts = [
  ...Array.from({ length: 19 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return product(`mate-${number}`, `Mate ${number}`, 'imperiales', 30000 + index)
  }),
  ...Array.from({ length: 8 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    return product(`bombillon-${number}`, `Bombillón ${number}`, 'bombillones', 20000 + index)
  }),
]

/** El botón "Más productos", si está. */
function moreButton(): HTMLElement | null {
  return screen.queryByRole('button', { name: 'Más productos' })
}

/** El link del nombre de la tarjeta en la posición `position` (desde 1) de lo que se ve. */
function cardLink(position: number): HTMLElement {
  const heading = screen.queryAllByRole('heading', { level: 3 }).at(position - 1)
  if (heading === undefined) throw new Error(`No hay tarjeta en la posición ${String(position)}`)
  return within(heading).getByRole('link')
}

/** jsdom no tiene `scrollIntoView`: se usa al terminar de desplegar para acercar la tarjeta enfocada. */
const scrollIntoView = vi.fn()

/** Lo que había en `Element.prototype.scrollIntoView` antes de las pruebas (en jsdom, nada). */
const nativeScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')

describe('CatalogBrowser: más productos', () => {
  beforeEach(() => {
    layout.columns = 6
    scrollIntoView.mockClear()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    })
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
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    resizeNotices.length = 0
    if (nativeScrollIntoView === undefined) {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    } else {
      Object.defineProperty(Element.prototype, 'scrollIntoView', nativeScrollIntoView)
    }
  })

  it('con 6 columnas muestra 4 hileras (24 piezas) y el botón "Más productos"', () => {
    renderCatalog(null, { products: manyProducts })
    expect(screen.getByRole('status')).toHaveTextContent('27 piezas')
    expect(shownNames()).toHaveLength(24)
    expect(moreButton()).toBeInTheDocument()
  })

  it('el botón despliega el resto, desaparece y deja el foco en la primera tarjeta nueva', async () => {
    const user = userEvent.setup()
    renderCatalog(null, { products: manyProducts })
    const button = screen.getByRole('button', { name: 'Más productos' })
    await user.click(button)
    expect(shownNames()).toHaveLength(27)
    expect(moreButton()).not.toBeInTheDocument()
    expect(cardLink(25)).toHaveFocus()
    // Al terminar de crecer, la tarjeta enfocada se acerca a la pantalla para el teclado.
    await vi.waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' })
    })
  })

  it('las 4 hileras siguen al ancho: con 4 columnas se ven 16', () => {
    renderCatalog(null, { products: manyProducts })
    layout.columns = 4
    act(() => {
      for (const notice of resizeNotices) notice()
    })
    expect(shownNames()).toHaveLength(16)
    expect(moreButton()).toBeInTheDocument()
  })

  it('una línea de 8 piezas (menos de 4 hileras) no muestra el botón', () => {
    renderCatalog('bombillones', { products: manyProducts })
    expect(shownNames()).toHaveLength(8)
    expect(moreButton()).not.toBeInTheDocument()
  })

  it('al cambiar el orden vuelve a 4 hileras con el botón', async () => {
    const user = userEvent.setup()
    renderCatalog(null, { products: manyProducts })
    await user.click(screen.getByRole('button', { name: 'Más productos' }))
    expect(shownNames()).toHaveLength(27)
    await user.selectOptions(sortSelect(), 'az')
    expect(shownNames()).toHaveLength(24)
    expect(moreButton()).toBeInTheDocument()
  })

  it('al buscar vuelve a 4 hileras: con 8 resultados no hay botón y al borrar vuelve a estar', async () => {
    const user = userEvent.setup()
    renderCatalog(null, { products: manyProducts })
    await user.click(screen.getByRole('button', { name: 'Más productos' }))
    await user.type(searchBox(), 'bombi')
    expect(shownNames()).toHaveLength(8)
    expect(moreButton()).not.toBeInTheDocument()
    await user.clear(searchBox())
    expect(shownNames()).toHaveLength(24)
    expect(moreButton()).toBeInTheDocument()
  })

  it('con menos movimiento las tarjetas nuevas aparecen de una, sin fundido', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const user = userEvent.setup()
    renderCatalog(null, { products: manyProducts })
    await user.click(screen.getByRole('button', { name: 'Más productos' }))
    expect(shownNames()).toHaveLength(27)
    expect(cardLink(25).closest('[style*="opacity"]')).toBeNull()
    expect(cardLink(25)).toHaveFocus()
  })
})
