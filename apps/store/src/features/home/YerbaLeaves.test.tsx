// @vitest-environment jsdom

import type { MockInstance } from 'vitest'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tokens } from '@galpon/design-tokens'
import { cleanUpAfterEach, mockReducedMotion } from '../../components/motion/test/support'
import { WORLD_MEDIA } from './world-media'
import { YerbaLeaves } from './YerbaLeaves'

cleanUpAfterEach()

/** La boca del mate del cuadro del mate. */
const MOUTH = WORLD_MEDIA.pieces.mouth ?? { x: 0.5, y: 0.5 }

/** Un `Path2D` de mentira: jsdom no lo tiene. */
class FakePath2D {
  /** La silueta, como la recibiría el navegador. */
  readonly d: string

  constructor(d: string) {
    this.d = d
  }
}

/** Lo que el lienzo simulado anota: cuántas hojas pinta y de qué colores. */
interface FakeContext {
  /** Cada hoja pintada. */
  fill: ReturnType<typeof vi.fn>
  /** El contexto que recibe el componente. */
  context: CanvasRenderingContext2D
  /** Los colores con que se pintó. */
  colors: Set<string>
}

/** Un contexto 2D simulado (jsdom no dibuja) con un lienzo de 720 × 270 px. */
function fakeCanvas(): FakeContext {
  const fill = vi.fn()
  const colors = new Set<string>()
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fill,
    globalAlpha: 1,
    set fillStyle(value: string) {
      colors.add(value)
    },
  } as unknown as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(720)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(270)
  vi.stubGlobal('Path2D', FakePath2D)
  return { fill, context, colors }
}

/** Cambia si la pestaña se ve y avisa como el navegador. */
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

/** `IntersectionObserver` de mentira que dice a pedido si el lienzo se ve (el de la tienda solo avisa que entró). */
class FakeVisibility {
  /** Los observadores creados en la prueba. */
  static instances: FakeVisibility[] = []
  /** Los elementos que observa. */
  readonly targets = new Set<Element>()
  private readonly callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    FakeVisibility.instances.push(this)
  }

  observe(target: Element): void {
    this.targets.add(target)
  }

  disconnect(): void {
    this.targets.clear()
  }

  /** Avisa si lo observado está a la vista o fuera de pantalla. */
  report(isIntersecting: boolean): void {
    const entries = [...this.targets].map((target) => ({ isIntersecting, target }))
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

/** Instala el observador de mentira y devuelve el que creó el componente. */
function installVisibility(): () => FakeVisibility {
  FakeVisibility.instances = []
  vi.stubGlobal('IntersectionObserver', FakeVisibility)
  return () => {
    const observer = FakeVisibility.instances.at(-1)
    if (observer === undefined) throw new Error('El componente no creó un IntersectionObserver')
    return observer
  }
}

let frames: FrameRequestCallback[]
let requestFrame: MockInstance<typeof window.requestAnimationFrame>
let cancelFrame: MockInstance<typeof window.cancelAnimationFrame>

beforeEach(() => {
  mockReducedMotion(false)
  frames = []
  requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
})

describe('YerbaLeaves', () => {
  it('es un lienzo decorativo encima de la boca del mate', () => {
    fakeCanvas()
    render(<YerbaLeaves target={MOUTH} />)
    const canvas = document.querySelector('canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas).toHaveAttribute('data-world-life', 'leaves')
    // Medio ancho de la capa centrado en la boca, desde arriba hasta un poco más abajo de ella.
    expect(canvas?.style.left).toBe('36%')
    expect(canvas?.style.width).toBe('50%')
    expect(canvas?.style.height).toBe('31%')
  })

  it('pinta pocas hojas en dos tonos de oliva, cuadro a cuadro', () => {
    const { fill, colors } = fakeCanvas()
    render(<YerbaLeaves target={MOUTH} />)
    expect(frames).toHaveLength(1)
    frames.at(-1)?.(0)
    frames.at(-1)?.(16)
    expect(fill.mock.calls.length).toBeGreaterThan(0)
    // Dos cuadros de a lo sumo 16 hojas: elegante, no nieve.
    expect(fill.mock.calls.length).toBeLessThanOrEqual(32)
    const olives: string[] = [tokens.colors.accent2[600], tokens.colors.accent2[700]]
    expect([...colors].every((color) => olives.includes(color))).toBe(true)
  })

  it('se pausa mientras la pestaña no se ve y sigue al volver', () => {
    fakeCanvas()
    const { unmount } = render(<YerbaLeaves target={MOUTH} />)
    expect(requestFrame).toHaveBeenCalledTimes(1)
    setHidden(true)
    expect(cancelFrame).toHaveBeenCalledWith(1)
    setHidden(false)
    expect(requestFrame).toHaveBeenCalledTimes(2)
    unmount()
    expect(cancelFrame).toHaveBeenLastCalledWith(2)
  })

  it('fuera de pantalla no pide cuadros y vuelve a dibujar al entrar', () => {
    fakeCanvas()
    const observer = installVisibility()
    const { unmount } = render(<YerbaLeaves target={MOUTH} />)
    expect(observer().targets.has(document.querySelector('canvas') as Element)).toBe(true)
    // Antes del primer aviso (o con el lienzo fuera de pantalla) no se pide ningún cuadro.
    expect(requestFrame).not.toHaveBeenCalled()
    observer().report(false)
    expect(requestFrame).not.toHaveBeenCalled()
    // Al entrar en pantalla arranca; al salir se cancela el cuadro pendiente.
    observer().report(true)
    expect(requestFrame).toHaveBeenCalledTimes(1)
    observer().report(false)
    expect(cancelFrame).toHaveBeenLastCalledWith(1)
    // Volver a la pestaña con el lienzo fuera de pantalla tampoco lo despierta.
    setHidden(true)
    setHidden(false)
    expect(requestFrame).toHaveBeenCalledTimes(1)
    observer().report(true)
    expect(requestFrame).toHaveBeenCalledTimes(2)
    unmount()
    expect(observer().targets.size).toBe(0)
    expect(cancelFrame).toHaveBeenLastCalledWith(2)
  })

  it('con menos movimiento no se monta', () => {
    fakeCanvas()
    mockReducedMotion(true)
    render(<YerbaLeaves target={MOUTH} />)
    expect(document.querySelector('canvas')).toBeNull()
    expect(requestFrame).not.toHaveBeenCalled()
  })
})
