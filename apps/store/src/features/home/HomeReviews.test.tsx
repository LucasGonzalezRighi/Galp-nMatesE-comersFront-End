// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeaturedReview } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { cleanUpAfterEach } from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { HomeReviews } from './HomeReviews'
import { advanceMarquee, revealOffset } from './ReviewsMarquee'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** Nombres de quienes escriben las cinco reseñas de prueba. */
const AUTHORS = ['Ana B.', 'Bruno C.', 'Carla D.', 'Diego E.', 'Elena F.'] as const

/** Ancho simulado de una copia de la lista más la separación: lo que recorre la cinta en una vuelta. */
const PERIOD_PX = 2000

/** Paso simulado entre una tarjeta y la siguiente (380 px de tarjeta y 20 de separación). */
const CARD_STEP_PX = 400

/** Ancho simulado de una tarjeta. */
const CARD_WIDTH_PX = 380

/** Ancho simulado de la ventana de la cinta. */
const VIEWPORT_PX = 1200

/** Propiedades de medida que jsdom no calcula y la prueba simula. */
const LAYOUT_PROPS = ['offsetLeft', 'offsetWidth', 'clientWidth'] as const

/** Cinco reseñas propias de la prueba, sobre la primera destacada del catálogo de fábrica. */
function fiveReviews(base: FeaturedReview): FeaturedReview[] {
  return AUTHORS.map((authorName, index) => ({
    ...base,
    id: `rev-prueba-${String(index + 1)}`,
    authorName,
    text: `Reseña de prueba número ${String(index + 1)}.`,
  }))
}

/** Datos del inicio con las cinco reseñas de prueba. */
async function homeData(): Promise<HomeData> {
  const data = buildHomeData(await loadFixtureCatalog())
  const [base] = data.reviews
  if (base === undefined) throw new Error('El catálogo de fábrica no tiene reseñas destacadas.')
  return { ...data, reviews: fiveReviews(base) }
}

/** Simula las preferencias del sistema: menos movimiento y pantalla de escritorio (≥ 1024 px). */
function mockMedia({ reduced, wide }: { reduced: boolean; wide: boolean }): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches:
        (reduced && query.includes('prefers-reduced-motion')) ||
        (wide && query.includes('min-width: 1024px')),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

/** Lugar de un elemento entre sus hermanos. */
function siblingIndex(element: Element): number {
  return element.parentElement === null
    ? 0
    : Array.prototype.indexOf.call(element.parentElement.children, element)
}

/**
 * Simula las medidas de la cinta (jsdom no maqueta): cada copia de la lista empieza `PERIOD_PX`
 * después de la anterior, las tarjetas van cada `CARD_STEP_PX` y la ventana mide `VIEWPORT_PX`.
 */
function stubLayout(): void {
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement): number {
      if (this.tagName === 'UL') return siblingIndex(this) * PERIOD_PX
      if (this.tagName === 'LI') return siblingIndex(this) * CARD_STEP_PX
      return 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: (): number => CARD_WIDTH_PX,
  })
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: (): number => VIEWPORT_PX,
  })
}

/** La cinta (lo que escucha el mouse y el foco). */
function marquee(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-marquee]')
  if (element === null) throw new Error('Falta la cinta de reseñas.')
  return element
}

/** La pista que se desplaza. */
function track(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-marquee-track]')
  if (element === null) throw new Error('Falta la pista de la cinta.')
  return element
}

/** Cuánto está corrida la pista hacia la derecha, en píxeles (negativo: hacia la izquierda). */
function trackX(): number {
  const match = /translate3d\((-?[\d.]+)px/.exec(track().style.transform)
  if (match === null)
    throw new Error(`La pista no tiene translate3d: "${track().style.transform}".`)
  return Number(match[1])
}

/** Deja correr el reloj de prueba (los cuadros de animación incluidos). */
function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

cleanUpAfterEach()

afterEach(() => {
  vi.useRealTimers()
  for (const prop of LAYOUT_PROPS) Reflect.deleteProperty(HTMLElement.prototype, prop)
  Reflect.deleteProperty(document, 'visibilityState')
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('advanceMarquee', () => {
  it('avanza la distancia pedida y vuelve a empezar al completar una vuelta', () => {
    expect(advanceMarquee(10, 5, 100)).toBe(15)
    expect(advanceMarquee(98, 5, 100)).toBe(3)
    expect(advanceMarquee(-80, 30, 100)).toBe(-50)
  })

  it('sin medida de la vuelta (0) no se mueve', () => {
    expect(advanceMarquee(12, 5, 0)).toBe(12)
  })

  it('rechaza distancias negativas y valores no finitos', () => {
    expect(() => advanceMarquee(0, -1, 100)).toThrow(RangeError)
    expect(() => advanceMarquee(Number.NaN, 1, 100)).toThrow(RangeError)
    expect(() => advanceMarquee(0, 1, Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('revealOffset', () => {
  it('no corre la pista si la tarjeta ya se ve entera entre los fundidos', () => {
    expect(revealOffset(0, 400, 380, 1200, 80)).toBe(0)
  })

  it('trae la tarjeta desde la derecha o desde la izquierda, fuera de los fundidos', () => {
    expect(revealOffset(-80, 1200, 380, 1200, 80)).toBe(460)
    expect(revealOffset(900, 400, 380, 1200, 80)).toBe(320)
  })

  it('una tarjeta más ancha que la ventana se alinea a la izquierda', () => {
    expect(revealOffset(0, 1000, 1500, 1200, 80)).toBe(920)
  })

  it('rechaza medidas negativas o no finitas', () => {
    expect(() => revealOffset(0, 0, -1, 1200, 80)).toThrow(RangeError)
    expect(() => revealOffset(0, Number.NaN, 380, 1200, 80)).toThrow(RangeError)
  })
})

describe('HomeReviews: la cinta', () => {
  beforeEach(() => {
    mockMedia({ reduced: false, wide: true })
  })

  it('muestra las cinco reseñas en una lista, con el texto, quién la escribió y el producto', async () => {
    render(<HomeReviews data={await homeData()} />)

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    for (const [index, author] of AUTHORS.entries()) {
      const item = items[index]
      if (item === undefined) throw new Error(`Falta la tarjeta ${String(index + 1)}.`)
      expect(within(item).getByText(author)).toBeInTheDocument()
      expect(
        within(item).getByText(`“Reseña de prueba número ${String(index + 1)}.”`),
      ).toBeVisible()
      expect(within(item).getByRole('link')).toHaveAttribute(
        'href',
        expect.stringMatching(/^\/producto\//),
      )
    }
  })

  it('duplica la lista: la segunda copia es decorativa (aria-hidden e inert, sin foco)', async () => {
    render(<HomeReviews data={await homeData()} />)

    const copies = track().querySelectorAll(':scope > ul')
    expect(copies).toHaveLength(2)
    expect(copies[0]).not.toHaveAttribute('aria-hidden')
    expect(copies[1]).toHaveAttribute('aria-hidden', 'true')
    expect(copies[1]).toHaveAttribute('inert')
    expect(copies[1]?.querySelectorAll('li')).toHaveLength(5)
  })

  it('ocupa todo el ancho, con fundidos en las puntas, sin puntos ni flechas', async () => {
    render(<HomeReviews data={await homeData()} />)

    expect(marquee().closest('.site-container')).toBeNull()
    expect(marquee()).toHaveClass('overflow-x-clip')
    expect(marquee().className).toContain('80px')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('ya no lleva la cortina del footer: ni sticky ni espaciador', async () => {
    const { container } = render(<HomeReviews data={await homeData()} />)

    expect(container.querySelector('[data-footer-curtain]')).toBeNull()
    expect(container.querySelector('[data-footer-spacer]')).toBeNull()
    expect(container.querySelector('section')?.className).not.toContain('sticky')
  })

  it('sin reseñas no dibuja nada', async () => {
    const data = await homeData()
    const { container } = render(<HomeReviews data={{ ...data, reviews: [] }} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('HomeReviews: el movimiento de la cinta', () => {
  beforeEach(() => {
    stubLayout()
  })

  it('en escritorio se mueve sola hacia la izquierda, continua, a unos 40 px/s', async () => {
    mockMedia({ reduced: false, wide: true })
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)
    advance(100)
    const start = trackX()

    advance(500)
    const half = trackX()
    advance(500)

    expect(half).toBeLessThan(start)
    expect(start - trackX()).toBeCloseTo(40, 0)
  })

  it('en el celular va más lenta, a unos 25 px/s', async () => {
    mockMedia({ reduced: false, wide: false })
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)
    advance(100)
    const start = trackX()

    advance(1000)

    expect(start - trackX()).toBeCloseTo(25, 0)
  })

  it('se pausa con el mouse encima y sigue al salir', async () => {
    mockMedia({ reduced: false, wide: true })
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)
    advance(100)

    fireEvent.mouseEnter(marquee())
    const paused = trackX()
    advance(2000)
    expect(trackX()).toBe(paused)
    expect(marquee()).toHaveAttribute('data-paused', 'true')

    fireEvent.mouseLeave(marquee())
    advance(1000)
    expect(trackX()).toBeLessThan(paused)
    expect(marquee()).toHaveAttribute('data-paused', 'false')
  })

  it('se pausa con el foco adentro y trae a la vista la tarjeta enfocada', async () => {
    mockMedia({ reduced: false, wide: true })
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    const link = within(items[3] ?? document.body).getByRole('link')

    act(() => {
      link.focus()
    })

    // La cuarta tarjeta (x = 1200) estaba fuera de la ventana: queda entera, antes del fundido.
    expect(trackX()).toBe(-(3 * CARD_STEP_PX + CARD_WIDTH_PX - (VIEWPORT_PX - 80)))
    const focused = trackX()
    advance(2000)
    expect(trackX()).toBe(focused)

    act(() => {
      link.blur()
    })
    advance(1000)
    expect(trackX()).toBeLessThan(focused)
  })

  it('se pausa con la pestaña oculta', async () => {
    mockMedia({ reduced: false, wide: true })
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)
    advance(100)

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const hidden = trackX()
    advance(2000)

    expect(trackX()).toBe(hidden)
  })

  it('con menos movimiento es una sola fila quieta y deslizable', async () => {
    mockMedia({ reduced: true, wide: true })
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)

    advance(3000)

    expect(track().querySelectorAll(':scope > ul')).toHaveLength(1)
    expect(track().style.transform).toBe('')
    expect(marquee()).toHaveClass('motion-reduce:overflow-x-auto')
  })
})
