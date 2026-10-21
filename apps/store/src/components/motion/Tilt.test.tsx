// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Magnetic } from './Magnetic'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'
import { Tilt, tiltAngles } from './Tilt'

cleanUpAfterEach()

/** Hace que el padre del elemento mida 200 por 100 píxeles desde el origen. */
function sizeParentOf(element: HTMLElement): void {
  vi.spyOn(element.parentElement ?? element, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 200, 100),
  )
}

describe('tiltAngles', () => {
  it('en el centro no inclina y en los bordes llega a la mitad de max (fórmula del diseño)', () => {
    expect(tiltAngles(0.5, 0.5, 10)).toEqual({ rotateX: 0, rotateY: 0 })
    expect(tiltAngles(1, 0, 10)).toEqual({ rotateX: 5, rotateY: 5 })
    expect(tiltAngles(0, 1, 10)).toEqual({ rotateX: -5, rotateY: -5 })
  })

  it('recorta posiciones fuera del elemento y valida los números', () => {
    expect(tiltAngles(9, -9, 10)).toEqual({ rotateX: 5, rotateY: 5 })
    expect(() => tiltAngles(0.5, 0.5, -1)).toThrow(RangeError)
    expect(() => tiltAngles(Number.NaN, 0.5, 10)).toThrow(/finita/)
  })
})

describe('Tilt', () => {
  it('con un mouse publica la posición en variables CSS y al salir la apaga', () => {
    mockReducedMotion(false)
    render(<Tilt>Tarjeta</Tilt>)
    const card = screen.getByText('Tarjeta')
    sizeParentOf(card)
    fireEvent.pointerMove(card, { pointerType: 'mouse', clientX: 150, clientY: 25 })
    expect(card.style.getPropertyValue('--hov')).toBe('1')
    expect(card.style.getPropertyValue('--mx')).toBe('75.0%')
    expect(card.style.getPropertyValue('--my')).toBe('25.0%')
    fireEvent.pointerLeave(card)
    expect(card.style.getPropertyValue('--hov')).toBe('0')
  })

  it('con el dedo o el lápiz no hace nada', () => {
    mockReducedMotion(false)
    render(<Tilt>Tarjeta</Tilt>)
    const card = screen.getByText('Tarjeta')
    sizeParentOf(card)
    fireEvent.pointerMove(card, { pointerType: 'touch', clientX: 150, clientY: 25 })
    fireEvent.pointerMove(card, { pointerType: 'pen', clientX: 150, clientY: 25 })
    expect(card.style.getPropertyValue('--hov')).toBe('')
  })

  it('con prefers-reduced-motion no se inclina', () => {
    mockReducedMotion(true)
    render(<Tilt>Tarjeta</Tilt>)
    const card = screen.getByText('Tarjeta')
    sizeParentOf(card)
    fireEvent.pointerMove(card, { pointerType: 'mouse', clientX: 150, clientY: 25 })
    expect(card.style.getPropertyValue('--hov')).toBe('')
    expect(card).toBeVisible()
  })

  it('rechaza max negativo', () => {
    expect(() => Tilt({ max: -1 })).toThrow(RangeError)
  })
})

describe('Magnetic', () => {
  it('muestra su contenido y rechaza valores negativos', () => {
    mockReducedMotion(false)
    render(
      <Magnetic>
        <button type="button">Comprar</button>
      </Magnetic>,
    )
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeVisible()
    expect(() => Magnetic({ strength: -1 })).toThrow(RangeError)
    expect(() => Magnetic({ reach: -1 })).toThrow(RangeError)
  })

  it('con el dedo o con prefers-reduced-motion no se mueve', () => {
    mockReducedMotion(false)
    render(
      <Magnetic>
        <button type="button">Comprar</button>
      </Magnetic>,
    )
    const wrapper = screen.getByRole('button').parentElement?.parentElement
    if (wrapper === null || wrapper === undefined) throw new Error('Falta el contenedor.')
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 40))
    fireEvent.pointerMove(wrapper, { pointerType: 'touch', clientX: 90, clientY: 30 })
    expect(screen.getByRole('button').parentElement?.style.transform ?? '').not.toContain('px')
  })
})
