// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { HomeData } from './home-data'
import { cleanUpAfterEach } from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { HomeReviews } from './HomeReviews'
import { MATE_PARTS, partOfReview } from './mate-parts'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** Datos del inicio del catálogo de fábrica: diez reseñas destacadas, dos por parte del mate. */
async function homeData(): Promise<HomeData> {
  return buildHomeData(await loadFixtureCatalog())
}

/** Simula las preferencias del sistema: con o sin menos movimiento. */
function mockMedia({ reduced }: { reduced: boolean }): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
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

/** Los observadores de prueba vivos, con lo que mira cada uno. */
const observers = new Set<{ callback: IntersectionObserverCallback; targets: Set<Element> }>()

/** Avisa a los observadores que miran `target` que apareció en pantalla. */
function reportIntersection(target: Element): void {
  for (const observer of observers) {
    if (observer.targets.has(target)) {
      observer.callback(
        [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    }
  }
}

/** Un `IntersectionObserver` de prueba que avisa cuando la prueba lo pide. */
function mockIntersectionObserver(): void {
  class FakeObserver {
    private readonly entry: { callback: IntersectionObserverCallback; targets: Set<Element> }
    constructor(callback: IntersectionObserverCallback) {
      this.entry = { callback, targets: new Set() }
      observers.add(this.entry)
    }
    observe(target: Element): void {
      this.entry.targets.add(target)
    }
    unobserve(target: Element): void {
      this.entry.targets.delete(target)
    }
    disconnect(): void {
      observers.delete(this.entry)
    }
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: FakeObserver,
  })
}

/** La foto del collage (lo que mira el collage para armarse). */
function photo(): Element {
  const element = stage().querySelector('[data-cell]')?.parentElement
  if (element === null || element === undefined) throw new Error('Falta la foto del collage.')
  return element
}

/** El escenario del collage. */
function stage(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-reviews-collage]')
  if (element === null) throw new Error('Falta el collage de reseñas.')
  return element
}

/** Las notas, en el orden en que se dibujan. */
function notes(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Reseñas de clientes' })).getAllByRole('listitem')
}

cleanUpAfterEach()

beforeEach(() => {
  mockMedia({ reduced: false })
})

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  Reflect.deleteProperty(window, 'IntersectionObserver')
  observers.clear()
})

describe('HomeReviews: las reseñas pegadas sobre el mate', () => {
  it('muestra una nota por reseña con la parte, el texto, quién la escribió, la compra verificada y el producto', async () => {
    const data = await homeData()
    render(<HomeReviews data={data} />)

    expect(notes()).toHaveLength(data.reviews.length)
    for (const review of data.reviews) {
      const note = screen.getByText(`“${review.text}”`).closest('li')
      if (note === null) throw new Error(`Falta la nota de ${review.authorName}.`)
      const item = within(note)
      expect(item.getByText(MATE_PARTS[partOfReview(review)].label)).toBeInTheDocument()
      expect(item.getByText(review.authorName)).toBeInTheDocument()
      expect(item.getByText('Compra verificada')).toBeInTheDocument()
      expect(item.getByRole('link', { name: review.product.name })).toHaveAttribute(
        'href',
        `/producto/${review.product.slug}`,
      )
    }
  })

  it('las diez de fábrica son dos por cada parte, cinco de cada lado del mate', async () => {
    render(<HomeReviews data={await homeData()} />)

    const parts = notes().map((note) => note.dataset.note)
    for (const part of ['boca', 'virola', 'bombilla', 'cuero', 'pie']) {
      expect(parts.filter((value) => value === part)).toHaveLength(2)
    }
    const sides = notes().map((note) => note.dataset.side)
    expect(sides.filter((side) => side === 'left')).toHaveLength(5)
    expect(sides.filter((side) => side === 'right')).toHaveLength(5)
  })

  it('sin compra verificada no lleva la marca', async () => {
    const data = await homeData()
    const reviews = data.reviews.map((review) => ({ ...review, verifiedPurchase: false }))
    render(<HomeReviews data={{ ...data, reviews }} />)

    expect(screen.queryByText('Compra verificada')).toBeNull()
  })

  it('la foto es decorativa: 60 recortes (8 × 8 sin las esquinas) fuera del árbol accesible', async () => {
    render(<HomeReviews data={await homeData()} />)

    const cells = stage().querySelectorAll('[data-cell]')
    expect(cells).toHaveLength(60)
    expect(cells[0]?.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('arranca desordenado y se arma cuando aparece la foto', async () => {
    mockIntersectionObserver()
    render(<HomeReviews data={await homeData()} />)

    expect(stage()).toHaveAttribute('data-assembled', 'false')
    expect(notes()[0]).toHaveClass('opacity-0')
    act(() => {
      reportIntersection(photo())
    })
    expect(stage()).toHaveAttribute('data-assembled', 'true')
    expect(notes()[0]).not.toHaveClass('opacity-0')
  })

  it('con menos movimiento aparece ya armado', async () => {
    mockMedia({ reduced: true })
    mockIntersectionObserver()
    render(<HomeReviews data={await homeData()} />)

    expect(stage()).toHaveAttribute('data-assembled', 'true')
  })

  it('con el mouse en una nota se ilumina su parte del mate y se apagan las demás', async () => {
    render(<HomeReviews data={await homeData()} />)
    const note = notes().find((item) => item.dataset.note === 'pie')
    if (note === undefined) throw new Error('Falta una nota del pie.')

    fireEvent.pointerEnter(note)

    expect(stage()).toHaveAttribute('data-active-part', 'pie')
    const cells = [...stage().querySelectorAll<HTMLElement>('[data-cell]')]
    const lit = cells.filter((cell) => cell.dataset.parts?.split(' ').includes('pie'))
    expect(lit.length).toBeGreaterThan(0)
    expect(lit.every((cell) => cell.classList.contains('brightness-125'))).toBe(true)
    expect(
      cells
        .filter((cell) => !lit.includes(cell))
        .every((cell) => cell.classList.contains('opacity-30')),
    ).toBe(true)
    expect(
      notes()
        .filter((item) => item !== note)
        .every((item) => item.classList.contains('opacity-60')),
    ).toBe(true)

    fireEvent.pointerLeave(note)
    expect(stage()).not.toHaveAttribute('data-active-part')
  })

  it('con el foco en el producto de una nota también se ilumina su parte', async () => {
    render(<HomeReviews data={await homeData()} />)
    const note = notes().find((item) => item.dataset.note === 'bombilla')
    if (note === undefined) throw new Error('Falta una nota de la bombilla.')
    const link = within(note).getByRole('link')

    act(() => {
      link.focus()
    })
    expect(stage()).toHaveAttribute('data-active-part', 'bombilla')

    act(() => {
      link.blur()
    })
    expect(stage()).not.toHaveAttribute('data-active-part')
  })

  it('sin reseñas no dibuja nada', async () => {
    const data = await homeData()
    const { container } = render(<HomeReviews data={{ ...data, reviews: [] }} />)

    expect(container).toBeEmptyDOMElement()
  })
})
