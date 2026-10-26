// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Review, ReviewPage, ReviewStats } from '@galpon/api-client'
import { ReviewList } from './ReviewList'
import { formatReviewCount } from './reviews-format'
import { ReviewsSection } from './ReviewsSection'
import { ReviewSummary } from './ReviewSummary'

// La sección incluye el formulario, que habla con la API: acá no se envía nada.
vi.mock('../../lib/api.browser', () => ({ getBrowserApi: vi.fn() }))

afterEach(() => {
  cleanup()
})

/** Una reseña aprobada, con lo que no se cambie. */
function review(overrides: Partial<Review> & { id: string }): Review {
  return {
    authorName: 'Martina R.',
    createdAt: '2026-09-15T15:00:00Z',
    rating: 5,
    text: 'La virola es una joya.',
    verifiedPurchase: true,
    ...overrides,
  }
}

const stats: ReviewStats = {
  average: 4.7,
  count: 3,
  distribution: [
    { stars: 5, count: 2, percent: 67 },
    { stars: 4, count: 1, percent: 33 },
    { stars: 3, count: 0, percent: 0 },
    { stars: 2, count: 0, percent: 0 },
    { stars: 1, count: 0, percent: 0 },
  ],
}

const emptyStats: ReviewStats = {
  average: 0,
  count: 0,
  distribution: [5, 4, 3, 2, 1].map((star) => ({ stars: star, count: 0, percent: 0 })),
}

describe('formatReviewCount', () => {
  it('usa el singular solo con una reseña', () => {
    expect(formatReviewCount(0)).toBe('0 reseñas')
    expect(formatReviewCount(1)).toBe('1 reseña')
    expect(formatReviewCount(3)).toBe('3 reseñas')
  })

  it('agrupa los miles con punto, como en la Argentina', () => {
    expect(formatReviewCount(1234)).toBe('1.234 reseñas')
    expect(formatReviewCount(1000000)).toBe('1.000.000 reseñas')
  })

  it('lanza RangeError si no es un entero mayor o igual a 0', () => {
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => formatReviewCount(value)).toThrow(RangeError)
    }
    expect(() => formatReviewCount(-1)).toThrow(/entero mayor o igual a 0/)
  })
})

describe('ReviewList', () => {
  it('muestra puntuación, mes y año, texto y firma de cada reseña', () => {
    render(<ReviewList reviews={[review({ id: 'rev-1' })]} />)

    const item = screen.getByRole('listitem')
    expect(within(item).getByText('Sep 2026')).toBeVisible()
    expect(within(item).getByText('La virola es una joya.')).toBeVisible()
    expect(within(item).getByText('Martina R. · Compra verificada')).toBeVisible()
  })

  it('"Compra verificada" aparece solo si la compra está verificada', () => {
    render(
      <ReviewList
        reviews={[
          review({ id: 'rev-1', authorName: 'Joaquín P.', verifiedPurchase: true }),
          review({ id: 'rev-2', authorName: 'Lucía F.', verifiedPurchase: false }),
        ]}
      />,
    )

    expect(screen.getByText('Joaquín P. · Compra verificada')).toBeVisible()
    expect(screen.getByText('Lucía F.')).toBeVisible()
    expect(screen.getAllByText(/Compra verificada/)).toHaveLength(1)
  })

  it('la fecha es la de Buenos Aires: el 1 de septiembre a las 02:00 UTC todavía es agosto', () => {
    render(<ReviewList reviews={[review({ id: 'rev-1', createdAt: '2026-09-01T02:00:00Z' })]} />)

    expect(screen.getByText('Ago 2026')).toBeVisible()
    expect(screen.queryByText('Sep 2026')).toBeNull()
  })

  it('un texto con HTML se muestra como texto', () => {
    render(
      <ReviewList reviews={[review({ id: 'rev-1', text: '<b>negrita</b> <script>x</script>' })]} />,
    )

    expect(screen.getByText('<b>negrita</b> <script>x</script>')).toBeVisible()
    expect(document.querySelector('script')).toBeNull()
  })

  it('sin reseñas invita a ser el primero', () => {
    render(<ReviewList reviews={[]} />)

    expect(
      screen.getByText(
        'Todavía no hay reseñas de este producto. Sé el primero en contar cómo te fue.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('list')).toBeNull()
  })
})

describe('ReviewSummary', () => {
  it('muestra el promedio, la cantidad y la distribución de 5 a 1 estrellas', () => {
    render(<ReviewSummary stats={stats} />)

    expect(screen.getByText('/ 5')).toBeVisible()
    expect(screen.getByText('3 reseñas')).toBeVisible()
    const rows = within(screen.getByRole('list', { name: 'Reseñas por puntuación' })).getAllByRole(
      'listitem',
    )
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('5 estrellas: 2')
    expect(rows[1]).toHaveTextContent('4 estrellas: 1')
    expect(rows[4]).toHaveTextContent('1 estrella: 0')
  })

  it('con miles de reseñas formatea la cantidad con punto', () => {
    render(<ReviewSummary stats={{ ...stats, count: 1234 }} />)

    expect(screen.getByText('1.234 reseñas')).toBeVisible()
  })

  it('sin reseñas muestra un guion y "Todavía no hay reseñas"', () => {
    render(<ReviewSummary stats={emptyStats} />)

    expect(screen.getByText('—')).toBeVisible()
    expect(screen.getByText('Todavía no hay reseñas')).toBeVisible()
  })
})

describe('ReviewsSection', () => {
  const page: ReviewPage = {
    items: [review({ id: 'rev-1' })],
    page: 1,
    pageSize: 10,
    stats,
    total: 3,
  }

  it('lleva el ancla #resenas y junta el resumen con el listado', () => {
    const { container } = render(
      <ReviewsSection
        slug="mate-imperial-premium"
        productName="Mate Imperial Premium"
        page={page}
      />,
    )

    expect(container.querySelector('section#resenas')).not.toBeNull()
    expect(screen.getByText('3 reseñas')).toBeVisible()
    expect(screen.getByText('La virola es una joya.')).toBeVisible()
  })

  it('"Escribir una reseña" abre y cierra el formulario', async () => {
    const user = userEvent.setup()
    render(
      <ReviewsSection
        slug="mate-imperial-premium"
        productName="Mate Imperial Premium"
        page={page}
      />,
    )
    const write = screen.getByRole('button', { name: 'Escribir una reseña' })
    expect(write).toHaveAttribute('aria-expanded', 'false')

    await user.click(write)
    expect(write).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('heading', { name: 'Tu reseña de Mate Imperial Premium' }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(write).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('heading', { name: 'Tu reseña de Mate Imperial Premium' })).toBeNull()
  })
})
