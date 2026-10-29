// @vitest-environment jsdom

import type { Mock } from 'vitest'
import { act, render } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MateSceneApi } from './scene'
import { cleanUpAfterEach } from '../../../components/motion/test/support'
import { mateStateAt } from './keyframes'
import { MateCanvas } from './MateCanvas'
import { createMateScene } from './scene'

// jsdom no tiene WebGL: la escena se simula y se prueba solo cómo la maneja el lienzo.
vi.mock('./scene', () => ({ createMateScene: vi.fn() }))

cleanUpAfterEach()

/** Una escena de mentira que anota lo que le piden. */
function fakeScene(): { [K in keyof MateSceneApi]: Mock<MateSceneApi[K]> } {
  return {
    setState: vi.fn(),
    setPointer: vi.fn(),
    setVisible: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }
}

/** Hace que los lienzos den (o no) un contexto WebGL. */
function mockWebGL(available: boolean): void {
  const context = { getExtension: () => ({ loseContext: () => undefined }) }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
    available && kind.startsWith('webgl') ? context : null) as HTMLCanvasElement['getContext'])
}

/** `IntersectionObserver` de mentira que dice a pedido si el lienzo se ve. */
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

/** El último observador creado por el componente. */
function observer(): FakeVisibility {
  const last = FakeVisibility.instances.at(-1)
  if (last === undefined) throw new Error('El componente no creó un IntersectionObserver')
  return last
}

/** Cambia si la pestaña se ve y avisa como el navegador. */
function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

/** Mueve un puntero del tipo indicado por la ventana. */
function movePointer(pointerType: string, clientX: number, clientY: number): void {
  const event = new MouseEvent('pointermove', { clientX, clientY })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  window.dispatchEvent(event)
}

/** Deja correr las promesas pendientes (la carga de la escena). */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  FakeVisibility.instances = []
  vi.stubGlobal('IntersectionObserver', FakeVisibility)
  vi.mocked(createMateScene).mockReset()
  setHidden(false)
})

describe('MateCanvas', () => {
  it('es un lienzo decorativo que llena el escenario', () => {
    mockWebGL(true)
    render(<MateCanvas progress={motionValue(0)} onUnavailable={vi.fn()} />)
    const canvas = document.querySelector('canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas).toHaveClass('absolute', 'inset-0', 'size-full')
  })

  it('sin WebGL avisa con onUnavailable y no carga la escena', () => {
    mockWebGL(false)
    const onUnavailable = vi.fn()
    render(<MateCanvas progress={motionValue(0)} onUnavailable={onUnavailable} />)
    expect(onUnavailable).toHaveBeenCalledTimes(1)
    expect(FakeVisibility.instances).toHaveLength(0)
    expect(createMateScene).not.toHaveBeenCalled()
  })

  it('carga la escena recién al entrar en pantalla y le pasa el estado del avance', async () => {
    mockWebGL(true)
    const scene = fakeScene()
    vi.mocked(createMateScene).mockResolvedValue(scene)
    const progress = motionValue(0.5)
    render(<MateCanvas progress={progress} onUnavailable={vi.fn()} />)
    expect(createMateScene).not.toHaveBeenCalled()
    observer().report(true)
    expect(createMateScene).toHaveBeenCalledWith(document.querySelector('canvas'))
    await settle()
    expect(scene.setState).toHaveBeenLastCalledWith(mateStateAt(0.5))
    expect(scene.setVisible).toHaveBeenLastCalledWith(true)
    act(() => {
      progress.set(1 / 3)
    })
    expect(scene.setState).toHaveBeenLastCalledWith(mateStateAt(1 / 3))
    // Un avance apenas fuera de 0 a 1 (el rebote del scroll) se recorta en vez de romper.
    act(() => {
      progress.set(1.02)
    })
    expect(scene.setState).toHaveBeenLastCalledWith(mateStateAt(1))
    // Volver a entrar en pantalla no la carga otra vez.
    observer().report(false)
    observer().report(true)
    expect(createMateScene).toHaveBeenCalledTimes(1)
  })

  it('si la escena no se puede crear avisa con onUnavailable', async () => {
    mockWebGL(true)
    vi.mocked(createMateScene).mockRejectedValue(new Error('sin contexto'))
    const onUnavailable = vi.fn()
    render(<MateCanvas progress={motionValue(0)} onUnavailable={onUnavailable} />)
    observer().report(true)
    await settle()
    expect(onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('se pausa fuera de pantalla y con la pestaña oculta, y se libera al desmontarse', async () => {
    mockWebGL(true)
    const scene = fakeScene()
    vi.mocked(createMateScene).mockResolvedValue(scene)
    const { unmount } = render(<MateCanvas progress={motionValue(0)} onUnavailable={vi.fn()} />)
    observer().report(true)
    await settle()
    expect(scene.setVisible).toHaveBeenLastCalledWith(true)
    observer().report(false)
    expect(scene.setVisible).toHaveBeenLastCalledWith(false)
    observer().report(true)
    expect(scene.setVisible).toHaveBeenLastCalledWith(true)
    setHidden(true)
    expect(scene.setVisible).toHaveBeenLastCalledWith(false)
    setHidden(false)
    expect(scene.setVisible).toHaveBeenLastCalledWith(true)
    unmount()
    expect(scene.dispose).toHaveBeenCalledTimes(1)
    expect(observer().targets.size).toBe(0)
  })

  it('si se desmonta mientras carga, libera la escena cuando llega', async () => {
    mockWebGL(true)
    const scene = fakeScene()
    let resolve: (api: MateSceneApi) => void = () => undefined
    vi.mocked(createMateScene).mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { unmount } = render(<MateCanvas progress={motionValue(0)} onUnavailable={vi.fn()} />)
    observer().report(true)
    unmount()
    resolve(scene)
    await settle()
    expect(scene.dispose).toHaveBeenCalledTimes(1)
    expect(scene.setState).not.toHaveBeenCalled()
  })

  it('el mouse mueve el parallax de −1 a 1; el dedo no', async () => {
    mockWebGL(true)
    const scene = fakeScene()
    vi.mocked(createMateScene).mockResolvedValue(scene)
    render(<MateCanvas progress={motionValue(0)} onUnavailable={vi.fn()} />)
    observer().report(true)
    await settle()
    movePointer('touch', 0, 0)
    expect(scene.setPointer).not.toHaveBeenCalled()
    movePointer('mouse', window.innerWidth, window.innerHeight / 2)
    expect(scene.setPointer).toHaveBeenLastCalledWith(1, 0)
    movePointer('mouse', 0, 0)
    expect(scene.setPointer).toHaveBeenLastCalledWith(-1, -1)
  })
})
