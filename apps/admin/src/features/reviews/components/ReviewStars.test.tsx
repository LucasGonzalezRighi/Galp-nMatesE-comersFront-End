import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReviewStars } from './ReviewStars'

/** Rellenos de las cinco estrellas, de izquierda a derecha. */
function fillsOf(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll('svg')).map((star) => star.getAttribute('data-fill'))
}

describe('ReviewStars', () => {
  it.each([
    [5, ['full', 'full', 'full', 'full', 'full']],
    [3, ['full', 'full', 'full', 'empty', 'empty']],
    [4.5, ['full', 'full', 'full', 'full', 'half']],
    [1.5, ['full', 'half', 'empty', 'empty', 'empty']],
  ])('con %s dibuja %j', (rating, fills) => {
    const { container } = render(<ReviewStars rating={rating} />)

    expect(fillsOf(container)).toEqual(fills)
  })

  it('las llenas y la media son cobre; las vacías, gris', () => {
    const { container } = render(<ReviewStars rating={3.5} />)
    const stars = Array.from(container.querySelectorAll('svg'))

    expect(stars.map((star) => star.classList.contains('text-accent'))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
    expect(stars[4]).toHaveClass('text-neutral-600')
  })

  it('anuncia la puntuación con coma decimal y oculta los íconos', () => {
    const { container } = render(<ReviewStars rating={4.5} />)

    expect(screen.getByText('4,5 de 5 estrellas')).toHaveClass('sr-only')
    for (const star of container.querySelectorAll('svg')) {
      expect(star).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('lanza RangeError con una puntuación que no es un múltiplo de 0,5 de 1 a 5', () => {
    expect(() => render(<ReviewStars rating={4.3} />)).toThrow(RangeError)
  })
})
