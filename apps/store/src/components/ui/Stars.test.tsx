// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Stars } from './Stars'

afterEach(cleanup)

/** Rellenos de las cinco estrellas, de izquierda a derecha. */
function fillsOf(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll('[data-fill]')).map((star) =>
    star.getAttribute('data-fill'),
  )
}

describe('Stars', () => {
  it('describe la puntuación con coma decimal', () => {
    render(<Stars value={4.7} />)

    expect(screen.getByRole('img', { name: '4,7 de 5' })).toBeVisible()
  })

  it('redondea el texto a un decimal', () => {
    render(<Stars value={4.666} />)

    expect(screen.getByRole('img', { name: '4,7 de 5' })).toBeVisible()
  })

  it.each([
    [0, '0,0 de 5'],
    [5, '5,0 de 5'],
  ])('acepta los extremos (%s)', (value, label) => {
    render(<Stars value={value} />)

    expect(screen.getByRole('img', { name: label })).toBeVisible()
  })

  it('dibuja estrellas llenas, medias y vacías', () => {
    const { container } = render(<Stars value={3.5} />)

    expect(fillsOf(container)).toEqual(['full', 'full', 'full', 'half', 'empty'])
  })

  it('redondea a la media estrella más cercana', () => {
    const high = render(<Stars value={4.8} />)
    expect(fillsOf(high.container)).toEqual(['full', 'full', 'full', 'full', 'full'])
    cleanup()

    const middle = render(<Stars value={4.3} />)
    expect(fillsOf(middle.container)).toEqual(['full', 'full', 'full', 'full', 'half'])
    cleanup()

    const low = render(<Stars value={4.2} />)
    expect(fillsOf(low.container)).toEqual(['full', 'full', 'full', 'full', 'empty'])
  })

  it('rechaza valores fuera de 0 a 5', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Stars value={5.1} />)).toThrow(RangeError)
    expect(() => render(<Stars value={-1} />)).toThrow(RangeError)
    expect(() => render(<Stars value={Number.NaN} />)).toThrow(RangeError)

    consoleError.mockRestore()
  })
})
