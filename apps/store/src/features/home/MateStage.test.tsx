// @vitest-environment jsdom

import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import type { Mock } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeData } from './home-data'
import type { MateSceneApi } from './mate3d/scene'
import { useHeaderMayHide } from '../../components/motion'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  intersectAll,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { mateStateAt } from './mate3d/keyframes'
import { createMateScene } from './mate3d/scene'
import { MateStage } from './MateStage'
import { MATE_STOPS } from './story-stops'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** El avance del scroll de la sección, que cada prueba mueve a mano (jsdom no hace scroll). */
const scroll = vi.hoisted((): { progress: unknown } => ({ progress: null }))

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useScroll: (): { scrollYProgress: unknown } => ({ scrollYProgress: scroll.progress }),
}))

// jsdom no tiene WebGL: la escena se simula y se prueba solo cómo la usa el escenario.
vi.mock('./mate3d/scene', () => ({ createMateScene: vi.fn() }))

/** Navegación simulada: las filas de producto llevan a la ficha con el router de Next. */
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

cleanUpAfterEach()

let progress: MotionValue<number>
let data: HomeData

/** Hace que los lienzos den (o no) un contexto WebGL. */
function mockWebGL(available: boolean): void {
  const context = { getExtension: () => ({ loseContext: () => undefined }) }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
    available && kind.startsWith('webgl') ? context : null) as HTMLCanvasElement['getContext'])
}

/** Una escena de mentira que anota los estados que recibe. */
function fakeScene(): { [K in keyof MateSceneApi]: Mock<MateSceneApi[K]> } {
  return {
    setState: vi.fn(),
    setPointer: vi.fn(),
    setVisible: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }
}

beforeEach(async () => {
  progress = motionValue(0)
  scroll.progress = progress
  mockReducedMotion(false)
  installIntersectionObserver()
  mockWebGL(true)
  vi.mocked(createMateScene).mockResolvedValue(fakeScene())
  data = buildHomeData(await loadFixtureCatalog())
})

/** Lleva el recorrido a la mitad de la parada quieta `index` (de 3). */
function goToStop(index: number): void {
  act(() => {
    progress.set((index + 0.25) / 3)
  })
}

/** La sección fija del mate. */
function stage(): HTMLElement {
  return screen.getByRole('region', { name: 'El mate' })
}

describe('MateStage', () => {
  it('dibuja las tres paradas en orden: la portada, la bombilla y el agua', () => {
    render(<MateStage data={data} />)
    // El encabezado de cada parada no se ve (Ruling MR-23): queda como nombre del panel.
    const headings = [...stage().querySelectorAll('[data-stage-stop]')].map((panel) =>
      panel.getAttribute('aria-label'),
    )
    expect(headings).toEqual(['01 / 03 · El mate', '02 / 03 · La bombilla', '03 / 03 · El agua'])
    expect(within(stage()).queryByText(/^\d{2} \/ 03 · /)).toBeNull()
    const first = document.querySelector<HTMLElement>('[data-stage-stop="0"]')
    if (first === null) throw new Error('Falta la primera parada.')
    expect(within(first).getByRole('heading', { level: 1 })).toHaveTextContent(
      /Encontrá.*tu mate\./,
    )
    // La portada ya entró con el servidor: en el escenario el título va quieto, sin su animación.
    expect(first.querySelector('.home-rise')).toBeNull()
    expect(within(first).getByRole('link', { name: 'Ver la tienda' })).toHaveAttribute(
      'href',
      '/tienda',
    )
    expect(within(first).getByRole('link', { name: /Armá tu kit/ })).toHaveTextContent('−10%')
    expect(within(first).getByText('Galpón Mates')).toBeInTheDocument()
    expect(
      within(stage())
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(['Alpacay bronce.', 'Agua a 75 °C.Nunca hervida.'])
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('el raíl tiene tres paradas y marca la actual', () => {
    render(<MateStage data={data} />)
    const rail = screen.getByRole('navigation', { name: 'Paradas del mate' })
    const buttons = within(rail).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      'El mate',
      'La bombilla',
      'El agua',
    ])
    expect(buttons[0]).toHaveAttribute('aria-current', 'true')
    goToStop(2)
    expect(buttons[2]).toHaveAttribute('aria-current', 'true')
    expect(buttons[0]).not.toHaveAttribute('aria-current')
  })

  it('tocar una parada del raíl desplaza la página hasta ella', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    render(<MateStage data={data} />)
    fireEvent.click(screen.getByRole('button', { name: 'El agua' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
  })

  it('se ve la parada actual; las demás quedan ocultas pero en el DOM', () => {
    render(<MateStage data={data} />)
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-stop]'))
    expect(panels).toHaveLength(3)
    const visible = (): boolean[] => panels.map((panel) => panel.classList.contains('opacity-100'))
    expect(visible()).toEqual([true, false, false])
    expect(panels.some((panel) => panel.closest('[aria-hidden="true"]') !== null)).toBe(false)
    // Cada panel es enfocable con su encabezado como nombre: Tab llega también a la parada del
    // agua, que no tiene botones.
    expect(panels.map((panel) => panel.tabIndex)).toEqual([0, 0, 0])
    expect(panels[2]).toHaveAccessibleName('03 / 03 · El agua')
    goToStop(1)
    expect(visible()).toEqual([false, true, false])
    expect(panels[1]).toHaveAttribute('data-current', 'true')
  })

  it('detrás, el fondo que se ve es el de la parada actual', () => {
    render(<MateStage data={data} />)
    const currentBackdrop = (): string | null =>
      document
        .querySelector('[data-backdrop][data-current="true"]')
        ?.getAttribute('data-backdrop') ?? null
    const sources = Array.from(document.querySelectorAll('[data-backdrop] img')).map((image) =>
      decodeURIComponent(image.getAttribute('src') ?? ''),
    )
    expect(sources).toHaveLength(3)
    expect(sources[0]).toContain('/hero/world/pieces.jpg')
    expect(sources[1]).toContain('/hero/world/bombilla.jpg')
    expect(sources[2]).toContain('/hero/world/ritual.jpg')
    expect(currentBackdrop()).toBe('hero')
    goToStop(1)
    expect(currentBackdrop()).toBe('bombilla')
    goToStop(2)
    expect(currentBackdrop()).toBe('ritual')
  })

  it('cada fondo lleva el encuadre de su parada, fijo (no cambia con el scroll)', () => {
    render(<MateStage data={data} />)
    const images = Array.from(document.querySelectorAll<HTMLElement>('[data-backdrop] img'))
    const framings = (): string[] =>
      images.map((image) => `${image.style.objectPosition} | ${image.style.transform}`)
    const expected = MATE_STOPS.map(
      ({ framing }) =>
        `${framing.objectPosition} | ${framing.scale === 1 ? '' : `scale(${String(framing.scale)})`}`,
    )
    expect(framings()).toEqual(expected)
    goToStop(2)
    expect(framings()).toEqual(expected)
  })

  it('el texto de la última parada se apaga en el mismo tramo final que el fundido a negro', () => {
    const panels = (): HTMLElement => {
      const element = document.querySelector<HTMLElement>('[data-stage-panels]')
      if (element === null) throw new Error('Faltan los paneles de texto.')
      return element
    }
    const { unmount } = render(<MateStage data={data} />)
    expect(panels().style.opacity).toBe('1')
    unmount()
    // Al final de la salida el mate pasa por el medio: el texto ya no está.
    progress.set(1)
    render(<MateStage data={data} />)
    expect(panels().style.opacity).toBe('0')
    expect(document.querySelector<HTMLElement>('[data-stage-fade]')?.style.opacity).toBe('1')
  })

  it('monta el mate 3D y le pasa el estado del avance, sin la foto de respaldo', async () => {
    const scene = fakeScene()
    vi.mocked(createMateScene).mockResolvedValue(scene)
    render(<MateStage data={data} />)
    expect(stage().querySelector('canvas[aria-hidden="true"]')).not.toBeNull()
    await act(async () => {
      intersectAll()
      await Promise.resolve()
    })
    expect(createMateScene).toHaveBeenCalledTimes(1)
    goToStop(1)
    expect(scene.setState).toHaveBeenLastCalledWith(mateStateAt(1.25 / 3))
    expect(document.querySelector('[data-mate-fallback]')).toBeNull()
  })

  it('sin WebGL muestra la foto del mate en lugar del lienzo', () => {
    mockWebGL(false)
    render(<MateStage data={data} />)
    const fallback = document.querySelector('[data-mate-fallback]')
    expect(fallback).not.toBeNull()
    expect(decodeURIComponent(fallback?.querySelector('img')?.getAttribute('src') ?? '')).toContain(
      '/hero/world/pieces.jpg',
    )
    expect(stage().querySelector('canvas')).toBeNull()
    expect(createMateScene).not.toHaveBeenCalled()
  })

  it('mientras se ve, avisa que el encabezado puede esconderse al bajar (Ruling MR-20)', () => {
    /** Muestra lo que lee el encabezado. */
    function Probe(): ReactNode {
      return useHeaderMayHide() ? 'puede esconderse' : 'queda a la vista'
    }
    const { rerender } = render(
      <>
        <Probe />
        <MateStage data={data} />
      </>,
    )
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
    act(() => {
      intersectAll()
    })
    expect(screen.getByText('puede esconderse')).toBeInTheDocument()
    rerender(<Probe />)
    expect(screen.getByText('queda a la vista')).toBeInTheDocument()
  })

  it('la pista "Deslizá para recorrer" se esconde al empezar', () => {
    render(<MateStage data={data} />)
    const hint = screen.getByText('Deslizá para recorrer')
    expect(hint).toHaveClass('opacity-100')
    goToStop(1)
    expect(hint).toHaveClass('opacity-0')
  })
})
