// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeData } from './home-data'
import { cleanUpAfterEach, installIntersectionObserver } from '../../components/motion/test/support'
import { addProductToCart } from '../cart'
import { HeroCarousel } from './HeroCarousel'
import { buildHomeData } from './home-data'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** El agregar al carrito se espía: acá se prueba que el botón lo pida, no el carrito. */
vi.mock('../cart', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../cart')>()),
  addProductToCart: vi.fn(),
}))

cleanUpAfterEach()

let data: HomeData

beforeEach(async () => {
  installIntersectionObserver()
  vi.mocked(addProductToCart).mockClear()
  data = buildHomeData(await loadFixtureCatalog())
})

/** Dibuja el carrusel con las piezas del catálogo de fábrica. */
function renderCarousel(): ReturnType<typeof render> {
  return render(
    <HeroCarousel
      hero={data.content.hero}
      slides={data.heroSlides}
      kitDiscountLabel={data.kitDiscountLabel}
    />,
  )
}

/** El nombre de la pieza que se lee (el único `h2` visible para los lectores de pantalla). */
function currentName(): string | null {
  return screen.getByRole('heading', { level: 2 }).textContent
}

/** La pila de tarjetas. */
function stack(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-hero-stack]')
  if (element === null) throw new Error('Falta la pila de tarjetas.')
  return element
}

describe('HeroCarousel', () => {
  it('muestra la píldora, el título y la primera pieza con su contador, sin la bajada de la portada', () => {
    renderCarousel()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Encontrá.*tu mate\./)
    expect(screen.getByText('Galpón Mates')).toBeInTheDocument()
    expect(currentName()).toBe('Mate Imperial Premium')
    expect(screen.getByText('01 — 05')).toBeInTheDocument()
    expect(screen.queryByText(data.content.hero.text)).toBeNull()
    // La palabra gigante es la del grupo de la pieza actual.
    expect(document.querySelector('[data-hero-word]')).toHaveTextContent('Mates')
  })

  it('las flechas pasan de pieza y dan la vuelta en los extremos', async () => {
    const user = userEvent.setup()
    renderCarousel()
    await user.click(screen.getByRole('button', { name: 'Pieza siguiente' }))
    expect(currentName()).toBe('Bombillón Premium Curvo')
    expect(screen.getByText('02 — 05')).toBeInTheDocument()
    expect(document.querySelector('[data-hero-word]')).toHaveTextContent('Bombillas')
    await user.click(screen.getByRole('button', { name: 'Pieza anterior' }))
    await user.click(screen.getByRole('button', { name: 'Pieza anterior' }))
    expect(currentName()).toBe('Bombillón 100% Alpaca')
    expect(screen.getByText('05 — 05')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pieza siguiente' }))
    expect(currentName()).toBe('Mate Imperial Premium')
  })

  it('cada punto lleva a su pieza y marca la actual', async () => {
    const user = userEvent.setup()
    renderCarousel()
    const dots = screen.getByRole('group', { name: 'Elegir pieza' })
    await user.click(within(dots).getByRole('button', { name: 'Yerba Canarias 1 kg' }))
    expect(currentName()).toBe('Yerba Canarias 1 kg')
    expect(within(dots).getByRole('button', { name: 'Yerba Canarias 1 kg' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(document.querySelector('[data-hero-word]')).toHaveTextContent('Yerba')
  })

  it('deslizar más de 50 px sobre la pila pasa de pieza; menos no', () => {
    renderCarousel()
    fireEvent.pointerDown(stack(), { clientX: 300, pointerId: 1 })
    fireEvent.pointerUp(stack(), { clientX: 240, pointerId: 1 })
    expect(currentName()).toBe('Bombillón Premium Curvo')
    fireEvent.pointerDown(stack(), { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(stack(), { clientX: 160, pointerId: 1 })
    expect(currentName()).toBe('Mate Imperial Premium')
    fireEvent.pointerDown(stack(), { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(stack(), { clientX: 140, pointerId: 1 })
    expect(currentName()).toBe('Mate Imperial Premium')
  })

  it('solo la pieza actual se lee y se puede tocar: las demás quedan inertes y ocultas', async () => {
    const user = userEvent.setup()
    renderCarousel()
    const cards = Array.from(stack().querySelectorAll('[data-hero-card]'))
    expect(cards).toHaveLength(5)
    const [first, ...rest] = cards
    expect(first).not.toHaveAttribute('aria-hidden')
    for (const card of rest) {
      expect(card).toHaveAttribute('aria-hidden', 'true')
      expect(card).toHaveAttribute('inert')
    }
    // La tarjeta actual lleva a la ficha; la info de las otras piezas tampoco se lee.
    expect(screen.getByRole('link', { name: 'Mate Imperial Premium' })).toHaveAttribute(
      'href',
      '/producto/mate-imperial-premium',
    )
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Ver pieza: Mate Imperial Premium' })).toHaveAttribute(
      'href',
      '/producto/mate-imperial-premium',
    )
    await user.click(screen.getByRole('button', { name: 'Pieza siguiente' }))
    expect(first).toHaveAttribute('aria-hidden', 'true')
    expect(cards[1]).not.toHaveAttribute('inert')
    expect(screen.getByRole('link', { name: 'Bombillón Premium Curvo' })).toBeInTheDocument()
  })

  it('Agregar suma la pieza actual al carrito', async () => {
    const user = userEvent.setup()
    renderCarousel()
    await user.click(screen.getByRole('button', { name: 'Pieza siguiente' }))
    await user.click(
      screen.getByRole('button', { name: 'Agregar Bombillón Premium Curvo al carrito' }),
    )
    expect(addProductToCart).toHaveBeenCalledTimes(1)
    expect(vi.mocked(addProductToCart).mock.calls[0]?.[0].product.name).toBe(
      'Bombillón Premium Curvo',
    )
  })

  it('la foto de la primera pieza carga con prioridad y con los anchos de la pila', () => {
    renderCarousel()
    const photo = stack().querySelector('[data-hero-card] img')
    expect(photo).toHaveAttribute('sizes', '(max-width: 1023px) 72vw, 40vw')
    // Con prioridad no espera a estar cerca de la pantalla (y Next la precarga en el HTML).
    expect(photo).not.toHaveAttribute('loading', 'lazy')
  })

  it('lleva a la tienda y al kit, con el descuento del kit', () => {
    renderCarousel()
    expect(screen.getByRole('link', { name: 'Ver la tienda' })).toHaveAttribute('href', '/tienda')
    const kit = screen.getByRole('link', { name: /Armá tu kit/ })
    expect(kit).toHaveAttribute('href', '/kit')
    expect(kit).toHaveTextContent('−10%')
  })

  it('"Encontrá tu mate." va en un renglón y los dos botones, centrados (Ruling AI-4)', () => {
    renderCarousel()
    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent('Encontrá tu mate.')
    expect([...title.querySelectorAll('[data-title-line]')].map((row) => row.textContent)).toEqual([
      'Encontrá tu mate.',
    ])
    expect(title).toHaveClass('whitespace-nowrap')
    expect(within(title).getByText('tu mate.')).toHaveClass('bg-clip-text')
    for (const name of ['Ver la tienda', /Armá tu kit/]) {
      expect(screen.getByRole('link', { name }).closest('.justify-center')).not.toBeNull()
    }
    expect(title.closest('.justify-center')).toBeNull()
  })

  it('sin piezas quedan el título y los botones, sin pila ni controles', () => {
    render(<HeroCarousel hero={data.content.hero} slides={[]} kitDiscountLabel={null} />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(document.querySelector('[data-hero-stack]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Pieza siguiente' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Armá tu kit' })).not.toHaveTextContent('−')
  })
})
