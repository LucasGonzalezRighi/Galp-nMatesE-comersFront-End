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

  it.each([
    [4.5, ['full', 'full', 'full', 'full', 'half']],
    [4.7, ['full', 'full', 'full', 'full', 'half']],
    [4.2, ['full', 'full', 'full', 'full', 'empty']],
    [5, ['full', 'full', 'full', 'full', 'full']],
    [0, ['empty', 'empty', 'empty', 'empty', 'empty']],
  ])('con %s dibuja %j', (value, fills) => {
    const { container } = render(<Stars value={value} />)

    expect(fillsOf(container)).toEqual(fills)
  })

  it('llena la estrella i desde i - 0,25 y la deja a la mitad desde i - 0,75', () => {
    const half = render(<Stars value={4.74} />)
    expect(fillsOf(half.container)).toEqual(['full', 'full', 'full', 'full', 'half'])
    cleanup()

    const edge = render(<Stars value={4.75} />)
    expect(fillsOf(edge.container)).toEqual(['full', 'full', 'full', 'full', 'full'])
    cleanup()

    const halfEdge = render(<Stars value={3.25} />)
    expect(fillsOf(halfEdge.container)).toEqual(['full', 'full', 'full', 'half', 'empty'])
    cleanup()

    const below = render(<Stars value={3.24} />)
    expect(fillsOf(below.container)).toEqual(['full', 'full', 'full', 'empty', 'empty'])
  })

  it('la media estrella es la silueta vacía con una llena encima recortada a la mitad', () => {
    const { container } = render(<Stars value={4.5} />)
    const half = container.querySelector('[data-fill="half"]')
    const icons = half?.querySelectorAll('svg') ?? []

    expect(icons).toHaveLength(2)
    expect(icons[0]?.getAttribute('class')).toContain('opacity-[0.22]')
    expect(icons[1]?.getAttribute('class')).toContain('[clip-path:inset(0_50%_0_0)]')
    expect(screen.getByRole('img', { name: '4,5 de 5' })).toBeVisible()
  })

  it('rechaza valores fuera de 0 a 5', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Stars value={5.1} />)).toThrow(RangeError)
    expect(() => render(<Stars value={-1} />)).toThrow(RangeError)
    expect(() => render(<Stars value={Number.NaN} />)).toThrow(RangeError)

    consoleError.mockRestore()
  })
})
