// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MagneticClaimContext } from '../motion/magnetic-context'
import { cleanUpAfterEach, mockReducedMotion } from '../motion/test/support'
import { Button, buttonFxClassName } from './Button'
import { magnetTransform, rippleGeometry } from './ButtonFx'

cleanUpAfterEach()

afterEach(() => {
  vi.useRealTimers()
})

/** El botón "Comprar" con una caja de 100 por 40 px en el origen de la ventana. */
function measuredButton(): HTMLElement {
  const button = screen.getByRole('button', { name: 'Comprar' })
  button.getBoundingClientRect = () => new DOMRect(0, 0, 100, 40)
  return button
}

/** La capa de efectos (banda del barrido y ondas) de un botón. */
function fxLayer(host: Element): HTMLElement {
  const layer = host.querySelector<HTMLElement>('[data-button-fx]')
  if (layer === null) throw new Error('El botón no tiene la capa de efectos.')
  return layer
}

describe('magnetTransform y rippleGeometry', () => {
  it('el imán corre hasta ±5 px en x y ±4 px en y, con escala 1,03', () => {
    expect(magnetTransform(0.25, 0.25)).toBe('translate3d(2.5px,2.0px,0) scale(1.03)')
    expect(magnetTransform(-0.5, 0.5)).toBe('translate3d(-5.0px,4.0px,0) scale(1.03)')
  })

  it('el imán recorta la posición a ±0,5 y rechaza valores no finitos', () => {
    expect(magnetTransform(3, -3)).toBe('translate3d(5.0px,-4.0px,0) scale(1.03)')
    expect(() => magnetTransform(Number.NaN, 0)).toThrow(RangeError)
  })

  it('la onda mide el doble del lado mayor y se centra en el clic', () => {
    expect(rippleGeometry(30, 10, new DOMRect(0, 0, 100, 40))).toEqual({
      left: -70,
      top: -90,
      size: 200,
    })
    expect(() => rippleGeometry(Number.NaN, 0, new DOMRect(0, 0, 10, 10))).toThrow(RangeError)
  })
})

describe('Button: los efectos del portafolio', () => {
  it('lleva la banda del barrido, decorativa (aria-hidden), detrás del texto', () => {
    mockReducedMotion(false)
    render(<Button>Comprar</Button>)

    const layer = fxLayer(screen.getByRole('button', { name: 'Comprar' }))
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer).toHaveClass('-z-10', 'overflow-hidden')
    expect(layer.querySelector('[data-button-sweep]')).toHaveClass(
      '[clip-path:inset(0_100%_0_0)]',
      'group-hover/btn:[clip-path:inset(0)]',
      'group-focus-visible/btn:[clip-path:inset(0)]',
    )
  })

  it('se llena de verde por defecto y de gris con fill="gray"; el texto pasa a blanco', () => {
    mockReducedMotion(false)
    render(
      <>
        <Button>Ver la tienda</Button>
        <Button fill="gray">Agregar al carrito</Button>
      </>,
    )

    const green = screen.getByRole('button', { name: 'Ver la tienda' })
    const gray = screen.getByRole('button', { name: 'Agregar al carrito' })
    expect(green).toHaveClass('[--btn-fill:var(--color-accent-2-700)]', 'focus-visible:text-[#fff]')
    expect(gray).toHaveClass('[--btn-fill:var(--color-neutral-600)]', 'group/btn', 'isolate')
    expect(buttonFxClassName('gray')).toContain('[--btn-fill:var(--color-neutral-600)]')
  })

  it('deshabilitado o cargando no lleva la banda', () => {
    mockReducedMotion(false)
    render(
      <>
        <Button disabled>Pagar</Button>
        <Button loading>Enviar</Button>
      </>,
    )

    for (const name of ['Pagar', 'Enviar']) {
      expect(screen.getByRole('button', { name }).querySelector('[data-button-fx]')).toBeNull()
    }
  })

  it('con asChild la banda va dentro del enlace', () => {
    mockReducedMotion(false)
    render(
      <Button asChild>
        <a href="https://ejemplo.test/tienda">Ver la tienda</a>
      </Button>,
    )

    expect(fxLayer(screen.getByRole('link', { name: 'Ver la tienda' }))).toBeInTheDocument()
  })

  it('el imán sigue al mouse y vuelve al salir', () => {
    mockReducedMotion(false)
    render(<Button>Comprar</Button>)
    const button = measuredButton()

    fireEvent.pointerMove(button, { pointerType: 'mouse', clientX: 75, clientY: 30 })
    expect(button.style.transform).toBe('translate3d(2.5px,2.0px,0) scale(1.03)')

    fireEvent.pointerLeave(button, { pointerType: 'mouse' })
    expect(button.style.transform).toBe('translate3d(0,0,0) scale(1)')
  })

  it('la onda se crea en pointerdown, centrada en el clic, y se borra a los 650 ms', () => {
    mockReducedMotion(false)
    vi.useFakeTimers()
    render(<Button>Comprar</Button>)
    const button = measuredButton()

    fireEvent.pointerDown(button, { pointerType: 'mouse', clientX: 30, clientY: 10 })

    const ripple = fxLayer(button).querySelector<HTMLElement>('[data-button-ripple]')
    expect(ripple).not.toBeNull()
    expect(ripple?.style.width).toBe('200px')
    expect(ripple?.style.left).toBe('-70px')
    expect(ripple?.style.top).toBe('-90px')
    act(() => {
      vi.advanceTimersByTime(650)
    })
    expect(fxLayer(button).querySelector('[data-button-ripple]')).toBeNull()
  })

  it('con el dedo no hay imán ni onda', () => {
    mockReducedMotion(false)
    render(<Button>Comprar</Button>)
    const button = measuredButton()

    fireEvent.pointerMove(button, { pointerType: 'touch', clientX: 75, clientY: 30 })
    fireEvent.pointerDown(button, { pointerType: 'touch', clientX: 30, clientY: 10 })

    expect(button.style.transform).toBe('')
    expect(fxLayer(button).querySelector('[data-button-ripple]')).toBeNull()
  })

  it('con menos movimiento no hay imán ni onda, y el barrido no tiene transición', () => {
    mockReducedMotion(true)
    render(<Button>Comprar</Button>)
    const button = measuredButton()

    fireEvent.pointerMove(button, { pointerType: 'mouse', clientX: 75, clientY: 30 })
    fireEvent.pointerDown(button, { pointerType: 'mouse', clientX: 30, clientY: 10 })

    expect(button.style.transform).toBe('')
    expect(fxLayer(button).querySelector('[data-button-ripple]')).toBeNull()
    expect(fxLayer(button).querySelector('[data-button-sweep]')).toHaveClass(
      'motion-reduce:transition-none',
      'pointer-coarse:transition-none',
    )
  })

  it('en el primario la flecha del final se corre 3 px; un ícono adelante no', () => {
    mockReducedMotion(false)
    render(
      <>
        <Button>
          Ver la tienda
          <svg data-testid="flecha" aria-hidden="true" />
        </Button>
        <Button>
          <svg data-testid="bolsa" aria-hidden="true" />
          Agregar
        </Button>
        <Button variant="secondary">
          Armá tu kit
          <svg data-testid="secundaria" aria-hidden="true" />
        </Button>
      </>,
    )

    expect(screen.getByTestId('flecha')).toHaveClass(
      'motion-safe:group-hover/btn:translate-x-[3px]',
    )
    expect(screen.getByTestId('bolsa')).not.toHaveClass(
      'motion-safe:group-hover/btn:translate-x-[3px]',
    )
    expect(screen.getByTestId('secundaria')).not.toHaveClass(
      'motion-safe:group-hover/btn:translate-x-[3px]',
    )
  })

  it('dentro de un Magnetic le avisa que el imán lo pone el botón', () => {
    mockReducedMotion(false)
    const claim = vi.fn()
    render(
      <MagneticClaimContext value={claim}>
        <Button>Comprar</Button>
      </MagneticClaimContext>,
    )

    expect(claim).toHaveBeenCalled()
  })
})
