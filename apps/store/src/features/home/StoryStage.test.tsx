// @vitest-environment jsdom

import type { MotionValue } from 'motion/react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeData } from './home-data'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { StoryStage } from './StoryStage'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** El avance del scroll de la sección, que cada prueba mueve a mano (jsdom no hace scroll). */
const scroll = vi.hoisted((): { progress: unknown } => ({ progress: null }))

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useScroll: (): { scrollYProgress: unknown } => ({ scrollYProgress: scroll.progress }),
}))

/** Navegación simulada: las filas de producto llevan a la ficha con el router de Next. */
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

cleanUpAfterEach()

let progress: MotionValue<number>
let data: HomeData

beforeEach(async () => {
  progress = motionValue(0)
  scroll.progress = progress
  mockReducedMotion(false)
  installIntersectionObserver()
  data = buildHomeData(await loadFixtureCatalog())
})

/** Lleva el paseo a la mitad de la parada quieta `index` (de 6). */
function goToStop(index: number): void {
  act(() => {
    progress.set((index + 0.25) / 6)
  })
}

describe('StoryStage', () => {
  it('dibuja las seis paradas en el orden del relato, con su encabezado', () => {
    render(<StoryStage data={data} />)
    const stage = screen.getByRole('region', { name: 'El paseo del mate' })
    const headings = within(stage)
      .getAllByText(/^\d{2} \/ 06 · /)
      .map((element) => element.textContent)
    expect(headings).toEqual([
      '01 / 06 · El yerbal',
      '02 / 06 · El galpón',
      '03 / 06 · El mate',
      '04 / 06 · La bombilla',
      '05 / 06 · El ritual',
      '06 / 06 · La ronda',
    ])
    expect(within(stage).getAllByRole('heading', { level: 2 })[2]).toHaveTextContent(
      'Tres piezas.Una ronda.',
    )
  })

  it('el raíl tiene una parada por escena y marca la primera como actual', () => {
    render(<StoryStage data={data} />)
    const rail = screen.getByRole('navigation', { name: 'Paradas del paseo' })
    const buttons = within(rail).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      'El yerbal',
      'El galpón',
      'El mate',
      'La bombilla',
      'El ritual',
      'La ronda',
    ])
    expect(buttons[0]).toHaveAttribute('aria-current', 'true')
    expect(buttons.slice(1).every((button) => !button.hasAttribute('aria-current'))).toBe(true)
  })

  it('tocar una parada del raíl desplaza la página hasta ella', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    render(<StoryStage data={data} />)
    fireEvent.click(screen.getByRole('button', { name: 'El ritual' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
  })

  it('los paneles están apilados: se ve el actual y los demás quedan ocultos pero en el DOM', () => {
    render(<StoryStage data={data} />)
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-stop]'))
    expect(panels).toHaveLength(6)
    const visible = (): boolean[] => panels.map((panel) => panel.classList.contains('opacity-100'))
    expect(visible()).toEqual([true, false, false, false, false, false])
    expect(panels.slice(1).every((panel) => panel.classList.contains('opacity-0'))).toBe(true)
    // Ocultos solo con opacidad: los lectores de pantalla y el teclado los siguen encontrando.
    expect(panels.some((panel) => panel.closest('[aria-hidden="true"]') !== null)).toBe(false)
    goToStop(2)
    expect(visible()).toEqual([false, false, true, false, false, false])
    expect(screen.getByRole('button', { name: 'El mate' })).toHaveAttribute('aria-current', 'true')
  })

  it('solo el primer panel espera a verse; los demás entran escalonados al volverse el actual', () => {
    render(<StoryStage data={data} />)
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-stop]'))
    // El estado oculto de `Reveal` (transparente o bajo su máscara) en línea, esperando a verse.
    const waiting = (panel: HTMLElement): number =>
      panel.querySelectorAll('[style*="opacity: 0"], [style*="translateY(108%)"]').length
    expect(waiting(panels[0] ?? document.body)).toBeGreaterThan(0)
    // Apilados en la ventana, sus `Reveal` dispararían todos juntos y sin verse: no los usan.
    expect(panels.slice(1).map(waiting)).toEqual([0, 0, 0, 0, 0])
    // La entrada la hace la columna del panel (`.home-stop-column` en `home.css`) con `data-current`.
    expect(panels.every((panel) => panel.querySelector('.home-stop-column') !== null)).toBe(true)
    goToStop(3)
    expect(panels[3]).toHaveAttribute('data-current', 'true')
    expect(panels.filter((panel) => panel.hasAttribute('data-current'))).toHaveLength(1)
  })

  it('detrás del texto, la capa del mundo actual es la de la parada actual', () => {
    render(<StoryStage data={data} />)
    const currentWorld = (): string | null =>
      document
        .querySelector('[data-world-stop][data-current="true"]')
        ?.getAttribute('data-world-stop') ?? null
    expect(document.querySelectorAll('[data-world-stop]')).toHaveLength(6)
    expect(currentWorld()).toBe('yerba')
    goToStop(2)
    expect(currentWorld()).toBe('pieces')
    goToStop(4)
    expect(currentWorld()).toBe('ritual')
  })

  it('en la parada del cuero el cuero destacado sigue el avance de la parada quieta', () => {
    const { container } = render(<StoryStage data={data} />)
    const selected = (): number =>
      Array.from(container.querySelectorAll('[style*="background-color"]')).findIndex(
        (swatch) => swatch.getAttribute('data-selected') === 'true',
      )
    expect(selected()).toBe(0)
    act(() => {
      progress.set(1)
    })
    expect(selected()).toBe(3)
  })

  it('la pista "Deslizá para recorrer" se esconde al empezar el paseo', () => {
    render(<StoryStage data={data} />)
    const hint = screen.getByText('Deslizá para recorrer')
    expect(hint).toHaveClass('opacity-100')
    goToStop(1)
    expect(hint).toHaveClass('opacity-0')
  })
})
