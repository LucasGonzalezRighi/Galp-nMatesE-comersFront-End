// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeaturedReview } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { cleanUpAfterEach, mockReducedMotion } from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { reviewPositionLabel } from './home.copy'
import { HomeReviews } from './HomeReviews'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** Cada cuánto avanza solo el carrusel, en milisegundos. */
const AUTOPLAY_MS = 6000

/** Nombres de quienes escriben las cinco reseñas de prueba. */
const AUTHORS = ['Ana B.', 'Bruno C.', 'Carla D.', 'Diego E.', 'Elena F.'] as const

/** `IntersectionObserver` de prueba que deja avisar a mano la visibilidad de cada elemento. */
class ManualIntersectionObserver {
  static instances: ManualIntersectionObserver[] = []
  readonly targets = new Set<Element>()

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    ManualIntersectionObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.targets.add(target)
  }

  unobserve(target: Element): void {
    this.targets.delete(target)
  }

  disconnect(): void {
    this.targets.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  /** Avisa cuánto se ve de cada elemento (de 0 a 1). */
  report(ratios: readonly (readonly [Element, number])[]): void {
    const entries = ratios.map(([target, ratio]): Partial<IntersectionObserverEntry> => ({
      target,
      intersectionRatio: ratio,
      isIntersecting: ratio > 0,
    }))
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

/** Reemplaza un método de los elementos HTML (jsdom no implementa los de scroll). */
function stubElementMethod(name: 'scrollTo' | 'scrollIntoView'): ReturnType<typeof vi.fn> {
  const mock = vi.fn()
  Object.defineProperty(HTMLElement.prototype, name, {
    configurable: true,
    writable: true,
    value: mock,
  })
  return mock
}

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

/** El observador del carrusel: el que mira las tarjetas dentro de la pista. */
function carouselObserver(track: HTMLElement): ManualIntersectionObserver {
  const observer = ManualIntersectionObserver.instances.find(
    (candidate) => candidate.options.root === track,
  )
  if (observer === undefined) throw new Error('El carrusel no observa sus tarjetas.')
  return observer
}

cleanUpAfterEach()

let scrollTo: ReturnType<typeof vi.fn>
let scrollIntoView: ReturnType<typeof vi.fn>

beforeEach(() => {
  ManualIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', ManualIntersectionObserver)
  scrollTo = stubElementMethod('scrollTo')
  scrollIntoView = stubElementMethod('scrollIntoView')
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('HomeReviews: el carrusel', () => {
  beforeEach(() => {
    mockReducedMotion(true)
  })

  it('muestra las cinco reseñas en una lista deslizable, con el texto, quién la escribió y el producto', async () => {
    const data = await homeData()
    render(<HomeReviews data={data} />)

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

  it('tiene los botones Anterior y Siguiente, y Anterior empieza deshabilitado', async () => {
    render(<HomeReviews data={await homeData()} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('tiene un punto por reseña y marca el actual con aria-current', async () => {
    render(<HomeReviews data={await homeData()} />)

    const dots = screen.getAllByRole('button', { name: /^Reseña \d de 5$/ })
    expect(dots).toHaveLength(5)
    expect(dots[0]).toHaveAttribute('aria-current', 'true')
    expect(dots.slice(1).every((dot) => !dot.hasAttribute('aria-current'))).toBe(true)
  })

  it('el punto actual y los extremos salen de lo que se ve de cada tarjeta', async () => {
    render(<HomeReviews data={await homeData()} />)
    const track = screen.getByRole('list')
    const items = within(track).getAllByRole('listitem')

    act(() => {
      carouselObserver(track).report(items.map((item, index) => [item, index >= 2 ? 1 : 0]))
    })

    expect(screen.getByRole('button', { name: 'Reseña 3 de 5' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Reseña 1 de 5' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('Siguiente desplaza la pista y anuncia la reseña a la que va', async () => {
    render(<HomeReviews data={await homeData()} />)
    const track = screen.getByRole('list')

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo.mock.contexts[0]).toBe(track)
    expect(screen.getByText('Reseña 2 de 5', { selector: '[aria-live="polite"]' })).toBeVisible()
  })

  it('un punto lleva a su reseña sin anunciarla', async () => {
    render(<HomeReviews data={await homeData()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Reseña 4 de 5' }))

    expect(scrollTo).toHaveBeenCalledTimes(1)
    const live = document.querySelector('[aria-live="polite"]')
    expect(live).toBeEmptyDOMElement()
  })

  it('al enfocar una tarjeta con Tab la trae a la vista', async () => {
    render(<HomeReviews data={await homeData()} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    const link = within(items[3] ?? document.body).getByRole('link')

    act(() => {
      link.focus()
    })

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
    expect(scrollIntoView.mock.contexts[0]).toBe(items[3])
  })

  it('con menos movimiento el avance automático no arranca', async () => {
    vi.useFakeTimers()
    render(<HomeReviews data={await homeData()} />)

    act(() => {
      vi.advanceTimersByTime(AUTOPLAY_MS * 3)
    })

    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('HomeReviews: el avance automático con movimiento', () => {
  beforeEach(() => {
    mockReducedMotion(false)
  })

  it('avanza solo cada seis segundos', async () => {
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)

    act(() => {
      vi.advanceTimersByTime(AUTOPLAY_MS - 1)
    })
    expect(scrollTo).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo.mock.contexts[0]).toBe(screen.getByRole('list'))
  })

  it('se pausa con el mouse encima y con el foco adentro', async () => {
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)
    const next = screen.getByRole('button', { name: 'Siguiente' })
    const carousel = next.closest('[data-carousel]')
    if (carousel === null) throw new Error('Falta el contenedor del carrusel.')

    fireEvent.mouseEnter(carousel)
    act(() => {
      vi.advanceTimersByTime(AUTOPLAY_MS * 2)
    })
    expect(scrollTo).not.toHaveBeenCalled()

    act(() => {
      next.focus()
    })
    fireEvent.mouseLeave(carousel)
    act(() => {
      vi.advanceTimersByTime(AUTOPLAY_MS * 2)
    })
    expect(scrollTo).not.toHaveBeenCalled()

    act(() => {
      next.blur()
    })
    act(() => {
      vi.advanceTimersByTime(AUTOPLAY_MS)
    })
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('se pausa con la pestaña oculta', async () => {
    const data = await homeData()
    vi.useFakeTimers()
    render(<HomeReviews data={data} />)

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    act(() => {
      vi.advanceTimersByTime(AUTOPLAY_MS * 2)
    })

    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('HomeReviews: el footer que sube', () => {
  beforeEach(() => {
    mockReducedMotion(true)
  })

  it('marca la sección para el footer que sube y deja después un espaciador oculto', async () => {
    const { container } = render(<HomeReviews data={await homeData()} />)

    const section = container.querySelector('section')
    expect(section).toHaveAttribute('data-footer-curtain')
    const spacer = section?.nextElementSibling
    expect(spacer).toHaveAttribute('data-footer-spacer')
    expect(spacer).toHaveAttribute('aria-hidden', 'true')
    expect(spacer).toBeEmptyDOMElement()
  })

  it('sin reseñas no dibuja ni la sección ni el espaciador', async () => {
    const data = await homeData()
    const { container } = render(<HomeReviews data={{ ...data, reviews: [] }} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('reviewPositionLabel', () => {
  it('arma el nombre de cada punto y rechaza posiciones fuera de rango', () => {
    expect(reviewPositionLabel(2, 5)).toBe('Reseña 2 de 5')
    expect(() => reviewPositionLabel(0, 5)).toThrow(RangeError)
    expect(() => reviewPositionLabel(6, 5)).toThrow(RangeError)
    expect(() => reviewPositionLabel(1.5, 5)).toThrow(RangeError)
    expect(() => reviewPositionLabel(1, 0)).toThrow(RangeError)
  })
})
