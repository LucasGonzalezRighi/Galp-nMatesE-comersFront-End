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

  it('dibuja estrellas enteras: la quinta de 4,7 queda vacía, sin media estrella', () => {
    const { container } = render(<Stars value={4.7} />)

    expect(fillsOf(container)).toEqual(['full', 'full', 'full', 'full', 'empty'])
  })

  it('llena la estrella i cuando la puntuación es de i - 0,25 o más', () => {
    const below = render(<Stars value={4.74} />)
    expect(fillsOf(below.container)).toEqual(['full', 'full', 'full', 'full', 'empty'])
    cleanup()

    const edge = render(<Stars value={4.75} />)
    expect(fillsOf(edge.container)).toEqual(['full', 'full', 'full', 'full', 'full'])
    cleanup()

    const middle = render(<Stars value={3.5} />)
    expect(fillsOf(middle.container)).toEqual(['full', 'full', 'full', 'empty', 'empty'])
    cleanup()

    const none = render(<Stars value={0} />)
    expect(fillsOf(none.container)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty'])
  })

  it('nunca dibuja una media estrella', () => {
    const { container } = render(<Stars value={4.5} />)

    expect(container.querySelector('[data-fill="half"]')).toBeNull()
  })

  it('rechaza valores fuera de 0 a 5', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Stars value={5.1} />)).toThrow(RangeError)
    expect(() => render(<Stars value={-1} />)).toThrow(RangeError)
    expect(() => render(<Stars value={Number.NaN} />)).toThrow(RangeError)

    consoleError.mockRestore()
  })
})
