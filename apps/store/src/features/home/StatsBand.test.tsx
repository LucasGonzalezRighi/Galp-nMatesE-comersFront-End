// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  cleanUpAfterEach,
  FakeIntersectionObserver,
  installIntersectionObserver,
  intersectAll,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { StatsBand } from './StatsBand'

cleanUpAfterEach()

/** Las cifras de prueba. */
const FIGURES = [
  { value: 27, label: 'Piezas en catálogo' },
  { value: 6, label: 'Líneas de producto' },
]

/** Lo que se ve de cada número (sin la copia invisible que reserva el ancho). */
function shownNumbers(): string[] {
  return FIGURES.map((figure) => {
    const number = screen.getByText(figure.label).previousElementSibling
    const count = number?.querySelector(':scope > span:not(.invisible)')
    // Con menos movimiento la cifra es texto suelto; si no, la parte visible va `aria-hidden`.
    return (count?.querySelector('[aria-hidden="true"]') ?? count)?.textContent ?? ''
  })
}

describe('StatsBand', () => {
  it('cada cifra es una columna centrada, con el ancho del número final reservado', () => {
    mockReducedMotion(true)
    installIntersectionObserver()
    render(<StatsBand figures={FIGURES} />)
    const label = screen.getByText('Piezas en catálogo')
    expect(label.parentElement).toHaveClass('items-center', 'text-center')
    const number = label.previousElementSibling
    expect(number).toHaveClass('grid', 'justify-items-center', 'tabular-nums')
    expect(number?.querySelector('.invisible')).toHaveTextContent('27')
    expect(shownNumbers()).toEqual(['27', '6'])
  })

  it('las cifras esperan en 0 y cuentan juntas hasta su número cuando la banda está entera a la vista', async () => {
    mockReducedMotion(false)
    installIntersectionObserver()
    render(<StatsBand figures={FIGURES} />)
    expect(shownNumbers()).toEqual(['0', '0'])
    act(() => {
      intersectAll()
    })
    await waitFor(
      () => {
        expect(shownNumbers()).toEqual(['27', '6'])
      },
      { timeout: 4000 },
    )
  })

  it('"entera a la vista" tolera un subpíxel: clavada, la banda queda al 0,99999 y con 1 no contaba', () => {
    mockReducedMotion(false)
    const thresholds: unknown[] = []
    vi.stubGlobal(
      'IntersectionObserver',
      class extends FakeIntersectionObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          super(callback)
          thresholds.push(options?.threshold)
        }
      },
    )
    render(<StatsBand figures={FIGURES} />)
    expect(thresholds).toContain(0.98)
  })
})
