// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bumpCartBadge, clickOrigin, flyToCart } from './fly-to-cart'

/** Animación simulada: guarda los oyentes para poder terminarla a mano. */
interface FakeAnimation {
  addEventListener: (type: string, listener: () => void) => void
  finish: () => void
}

const animate = vi.fn()
const animations: FakeAnimation[] = []

/** Simula `matchMedia` con o sin `prefers-reduced-motion`. */
function mockReducedMotion(reduced: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockReturnValue({ matches: reduced }),
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  animations.length = 0
  animate.mockReset()
  animate.mockImplementation(() => {
    const listeners: Record<string, () => void> = {}
    const animation: FakeAnimation = {
      addEventListener: (type, listener) => {
        listeners[type] = listener
      },
      finish: () => listeners.finish?.(),
    }
    animations.push(animation)
    return animation
  })
  Object.defineProperty(Element.prototype, 'animate', {
    value: animate,
    configurable: true,
    writable: true,
  })
  mockReducedMotion(false)
  document.body.innerHTML = `
    <button data-cart-button>Carrito <span data-cart-badge>0</span></button>
  `
  const button = document.querySelector('[data-cart-button]')
  if (button === null) throw new Error('Falta el botón del carrito')
  button.getBoundingClientRect = () => new DOMRect(900, 10, 100, 40)
})

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, 'animate')
})

describe('flyToCart', () => {
  it('lanza un punto desde el clic hasta el botón del carrito y, al llegar, rebota el contador', () => {
    flyToCart({ x: 100, y: 300 })

    const dot = document.body.querySelector('div[aria-hidden="true"]')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveStyle({ position: 'fixed', left: '93px', top: '293px', zIndex: '95' })
    expect(animate).toHaveBeenCalledOnce()

    animations[0]?.finish()

    expect(dot).not.toBeInTheDocument()
    // La segunda animación es el rebote del contador.
    expect(animate).toHaveBeenCalledTimes(2)
  })

  it('sin punto de salida solo rebota el contador', () => {
    flyToCart()

    expect(document.body.querySelector('div[aria-hidden="true"]')).toBeNull()
    expect(animate).toHaveBeenCalledOnce()
  })

  it('con prefers-reduced-motion no anima nada', () => {
    mockReducedMotion(true)

    flyToCart({ x: 1, y: 1 })
    bumpCartBadge()

    expect(animate).not.toHaveBeenCalled()
    expect(document.body.querySelector('div[aria-hidden="true"]')).toBeNull()
  })

  it('sin botón del carrito en la página no falla', () => {
    document.body.innerHTML = ''

    expect(() => {
      flyToCart({ x: 1, y: 1 })
    }).not.toThrow()
    expect(animate).not.toHaveBeenCalled()
  })

  it('sin soporte de animaciones del navegador no hace nada', () => {
    Reflect.deleteProperty(Element.prototype, 'animate')

    expect(() => {
      flyToCart({ x: 1, y: 1 })
    }).not.toThrow()
  })
})

describe('clickOrigin', () => {
  it('usa la posición del clic', () => {
    expect(clickOrigin({ clientX: 120, clientY: 340, currentTarget: document.body })).toEqual({
      x: 120,
      y: 340,
    })
  })

  it('un clic con teclado (posición 0, 0) sale del centro del botón', () => {
    const button = document.createElement('button')
    button.getBoundingClientRect = () => new DOMRect(100, 200, 40, 20)

    expect(clickOrigin({ clientX: 0, clientY: 0, currentTarget: button })).toEqual({
      x: 120,
      y: 210,
    })
  })

  it('sin un elemento donde medir no hay punto de salida', () => {
    expect(clickOrigin({ clientX: 0, clientY: 0, currentTarget: window })).toBeUndefined()
  })
})
