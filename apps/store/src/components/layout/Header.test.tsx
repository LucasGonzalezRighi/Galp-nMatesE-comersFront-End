// @vitest-environment jsdom

import type { MotionValue } from 'motion/react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { motionValue } from 'motion/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReducedMotion } from '../motion/test/support'
import { Header } from './Header'
import { closeSearch, useSearchOpen } from './search-trigger'
import { TopBar } from './TopBar'

/** Ruta simulada: cada prueba la cambia antes de dibujar. */
const route = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: (): string => route.pathname,
}))

/** El scroll que lee el encabezado que se esconde (`useScroll` de Motion), movido a mano. */
const motionScroll = vi.hoisted((): { y: unknown } => ({ y: null }))

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useScroll: (): { scrollY: unknown } => ({ scrollY: motionScroll.y }),
}))

let motionScrollY: MotionValue<number>

/** Mueve el scroll que lee `useScrollDirection`. */
function moveScroll(y: number): void {
  act(() => {
    motionScrollY.set(y)
  })
}

/** El encabezado. */
function header(): HTMLElement {
  const element = document.querySelector('header')
  if (element === null) throw new Error('Falta el encabezado')
  return element
}

/** Muestra si el buscador está abierto, como lo haría el modal de la feature de búsqueda. */
function SearchProbe(): string {
  return useSearchOpen() ? 'buscador abierto' : 'buscador cerrado'
}

/** Frena la navegación de un enlace (jsdom no la implementa). */
function preventNavigation(event: Event): void {
  event.preventDefault()
}

/** Mueve el scroll de la ventana y avisa. */
function scrollTo(y: number): void {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => {
    fireEvent.scroll(window)
  })
}

/** El fondo de vidrio del encabezado. */
function glass(): Element {
  const element = document.querySelector('[data-glass]')
  if (element === null) throw new Error('Falta el fondo de vidrio')
  return element
}

beforeEach(() => {
  route.pathname = '/'
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  motionScrollY = motionValue(0)
  motionScroll.y = motionScrollY
})

afterEach(() => {
  closeSearch()
  cleanup()
  Reflect.deleteProperty(window, 'matchMedia')
  window.history.pushState({}, '', '/')
})

describe('Header', () => {
  it('tiene el logo que lleva al inicio y los seis links de la navegación', () => {
    render(<Header />)

    expect(screen.getByRole('link', { name: 'Galpón — inicio' })).toHaveAttribute('href', '/')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Tienda', 'Armá tu kit', 'Nosotros', 'Preguntas', 'Contacto'])
  })

  it.each([
    ['/', 'Inicio'],
    ['/tienda', 'Tienda'],
    ['/tienda/bombillones', 'Tienda'],
    ['/producto/mate-imperial-premium', 'Tienda'],
    ['/kit', 'Armá tu kit'],
    ['/preguntas-frecuentes', 'Preguntas'],
  ])('en %s el link activo es "%s" (aria-current)', (pathname, label) => {
    route.pathname = pathname

    render(<Header />)

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    const current = within(nav)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.textContent)).toEqual([label])
  })

  it('cada link subraya al pasar el mouse (240 ms, desde la izquierda); el activo, fijo', () => {
    route.pathname = '/tienda'

    render(<Header />)

    const nav = screen.getByRole('navigation', { name: 'Principal' })
    const underline = (name: string): Element | null =>
      within(nav).getByRole('link', { name }).querySelector('[aria-hidden="true"]')
    expect(underline('Inicio')).toHaveClass(
      'scale-x-0',
      'origin-left',
      'duration-240',
      'group-hover/nav:scale-x-100',
      'group-focus-visible/nav:scale-x-100',
    )
    expect(underline('Tienda')).toHaveClass('scale-x-100')
    expect(underline('Tienda')).not.toHaveClass('scale-x-0')
  })

  it('en una página que no es del menú no marca ningún link', () => {
    route.pathname = '/checkout'

    render(<Header />)

    expect(
      within(screen.getByRole('navigation', { name: 'Principal' })).queryByRole('link', {
        current: 'page',
      }),
    ).toBeNull()
  })

  it('la lupa abre el buscador con el evento que escucha la feature de búsqueda', async () => {
    render(
      <>
        <Header />
        <SearchProbe />
      </>,
    )
    expect(screen.getByText('buscador cerrado')).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(screen.getByText('buscador abierto')).toBeVisible()
  })

  it('trae el botón del carrito con su contador', () => {
    render(<Header />)

    expect(screen.getByRole('button', { name: 'Abrir carrito' })).toHaveTextContent('Carrito')
  })

  it('el vidrio aparece pasados los 8 px de scroll y se va al volver arriba', () => {
    render(<Header />)
    expect(glass()).toHaveClass('opacity-0')

    scrollTo(8)
    expect(glass()).toHaveClass('opacity-0')

    scrollTo(9)
    expect(glass()).toHaveClass('opacity-100')

    scrollTo(0)
    expect(glass()).toHaveClass('opacity-0')
  })

  it('la barra de progreso sigue el scroll de toda la página', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 2000,
      configurable: true,
    })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    render(<Header />)

    scrollTo(600)

    await waitFor(() => {
      expect(document.querySelector<HTMLElement>('[style*="scaleX"]')?.style.transform).toBe(
        'scaleX(0.5000)',
      )
    })
  })
})

describe('menú del celular', () => {
  it('la hamburguesa abre un diálogo con los seis links y se cierra al elegir uno', async () => {
    render(<Header />)
    const toggle = screen.getByRole('button', { name: 'Menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(toggle)

    const dialog = await screen.findByRole('dialog', { name: 'Menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const links = within(dialog).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Inicio',
      'Tienda',
      'Armá tu kit',
      'Nosotros',
      'Preguntas frecuentes',
      'Contacto',
    ])
    expect(links[1]).toHaveAttribute('href', '/tienda')

    // Sin router, jsdom intentaría navegar de verdad: se frena el clic del enlace.
    document.addEventListener('click', preventNavigation, { once: true })
    const shop = links[1]
    if (shop === undefined) throw new Error('Falta el link de la tienda')
    await userEvent.click(shop)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('arranca debajo del encabezado y lo deja a la vista', async () => {
    render(<Header />)
    const header = document.querySelector('header')
    if (header === null) throw new Error('Falta el encabezado')
    header.getBoundingClientRect = () => new DOMRect(0, 32, 390, 64)

    await userEvent.click(screen.getByRole('button', { name: 'Menú' }))

    const dialog = await screen.findByRole('dialog', { name: 'Menú' })
    expect(within(dialog).getByRole('navigation', { name: 'Menú' })).toHaveStyle({ top: '96px' })
    // El diálogo del menú va por debajo del encabezado fijo (z-50).
    expect(dialog.parentElement).toHaveClass('z-[45]')
  })

  it('Escape lo cierra', async () => {
    render(<Header />)
    await userEvent.click(screen.getByRole('button', { name: 'Menú' }))
    expect(await screen.findByRole('dialog')).toBeVisible()

    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})

describe('el encabezado que se esconde', () => {
  it('se desliza hacia arriba al bajar más de 80 px y vuelve al subir', () => {
    render(<Header />)
    expect(header()).not.toHaveClass('-translate-y-full')
    expect(header()).toHaveClass('duration-300', 'motion-reduce:transition-none')

    moveScroll(60)
    expect(header()).not.toHaveClass('-translate-y-full')

    moveScroll(240)
    expect(header()).toHaveClass('-translate-y-full')
    expect(header()).toHaveAttribute('data-hidden')

    moveScroll(200)
    expect(header()).not.toHaveClass('-translate-y-full')
    expect(header()).not.toHaveAttribute('data-hidden')
  })

  it('no se esconde con el foco adentro', () => {
    render(<Header />)
    const search = screen.getByRole('button', { name: 'Buscar' })

    act(() => {
      search.focus()
    })
    moveScroll(400)
    expect(header()).not.toHaveClass('-translate-y-full')

    act(() => {
      search.blur()
    })
    expect(header()).toHaveClass('-translate-y-full')
  })

  it('no se esconde con el menú abierto', async () => {
    render(<Header />)
    await userEvent.click(screen.getByRole('button', { name: 'Menú' }))
    await screen.findByRole('dialog', { name: 'Menú' })

    moveScroll(400)
    moveScroll(500)

    expect(header()).not.toHaveClass('-translate-y-full')
  })

  it('la barra de progreso queda fuera del encabezado (no se esconde con él)', () => {
    render(<Header />)

    expect(header().querySelector('[style*="scaleX"]')).toBeNull()
    expect(document.querySelector('[style*="scaleX"]')).not.toBeNull()
  })
})

describe('el logo GALPÓN', () => {
  /** Reemplaza `window.scrollTo` (jsdom no lo implementa). */
  function stubWindowScroll(): ReturnType<typeof vi.fn> {
    const scroll = vi.fn()
    vi.stubGlobal('scrollTo', scroll)
    return scroll
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('en el inicio sube todo con scroll suave, no navega y, ya arriba, lleva el foco al principio', async () => {
    const scroll = stubWindowScroll()
    render(
      <>
        <Header />
        <main>
          <h1>Encontrá tu mate.</h1>
        </main>
      </>,
    )

    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'Galpón — inicio' }))

    expect(notPrevented).toBe(false)
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    const title = screen.getByRole('heading', { name: 'Encontrá tu mate.' })
    await waitFor(() => {
      expect(title).toHaveFocus()
    })
    expect(title).toHaveAttribute('tabindex', '-1')
  })

  it('si el scroll no llega arriba (se volvió a bajar), no mueve el foco', () => {
    stubWindowScroll()
    vi.useFakeTimers()
    render(
      <>
        <Header />
        <main>
          <h1>Encontrá tu mate.</h1>
        </main>
      </>,
    )
    Object.defineProperty(window, 'scrollY', { value: 900, configurable: true })

    fireEvent.click(screen.getByRole('link', { name: 'Galpón — inicio' }))
    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.getByRole('heading', { name: 'Encontrá tu mate.' })).not.toHaveFocus()
    vi.useRealTimers()
  })

  it('con menos movimiento sube sin animar', () => {
    mockReducedMotion(true)
    const scroll = stubWindowScroll()
    render(<Header />)

    fireEvent.click(screen.getByRole('link', { name: 'Galpón — inicio' }))

    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('en otra página navega al inicio como siempre, sin subir a mano', () => {
    window.history.pushState({}, '', '/tienda')
    const scroll = stubWindowScroll()
    render(<Header />)
    document.addEventListener('click', preventNavigation, { once: true })

    fireEvent.click(screen.getByRole('link', { name: 'Galpón — inicio' }))

    expect(scroll).not.toHaveBeenCalled()
  })

  it('con Ctrl (abrir en otra pestaña) no sube a mano', () => {
    const scroll = stubWindowScroll()
    render(<Header />)
    document.addEventListener('click', preventNavigation, { once: true })

    fireEvent.click(screen.getByRole('link', { name: 'Galpón — inicio' }), { ctrlKey: true })

    expect(scroll).not.toHaveBeenCalled()
  })
})

describe('TopBar', () => {
  it('muestra el link del botón de arrepentimiento', () => {
    render(<TopBar />)

    expect(screen.getByRole('link', { name: 'Botón de arrepentimiento' })).toHaveAttribute(
      'href',
      '/arrepentimiento',
    )
  })
})
