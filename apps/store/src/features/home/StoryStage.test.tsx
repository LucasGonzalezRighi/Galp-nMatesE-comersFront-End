// @vitest-environment jsdom

import type { MotionValue } from 'motion/react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductSummary } from '@galpon/api-client'
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

/** Los datos con una foto propia del test en el primer bombillón y la primera yerba. */
function withPhotos(base: HomeData): HomeData {
  const image = base.story.hero?.mainImage
  if (image === null || image === undefined) throw new Error('El mate de fábrica no tiene foto.')
  const photo = (product: ProductSummary, url: string): ProductSummary => ({
    ...product,
    mainImage: { ...image, url },
  })
  const [bombilla, ...bombillas] = base.story.bombillas
  const [yerba, ...yerbas] = base.story.yerbas
  if (bombilla === undefined || yerba === undefined) throw new Error('Faltan productos.')
  return {
    ...base,
    story: {
      ...base.story,
      bombillas: [photo(bombilla, '/test/bombilla.jpg'), ...bombillas],
      yerbas: [photo(yerba, '/test/yerba.jpg'), ...yerbas],
    },
  }
}

/** Los datos sin foto en el primer bombillón (en el catálogo de fábrica tiene una). */
function withoutBombillaPhoto(base: HomeData): HomeData {
  const [bombilla, ...bombillas] = base.story.bombillas
  if (bombilla === undefined) throw new Error('Falta el bombillón.')
  return {
    ...base,
    story: { ...base.story, bombillas: [{ ...bombilla, mainImage: null }, ...bombillas] },
  }
}

/** El slug de la pieza que muestra el mate. */
function shownPiece(): string | null {
  return (
    document.querySelector('[data-current="true"][data-piece]')?.getAttribute('data-piece') ?? null
  )
}

describe('StoryStage', () => {
  it('dibuja las seis paradas en el orden de la historia, con su encabezado', () => {
    render(<StoryStage data={data} />)
    const stage = screen.getByRole('region', { name: 'El paseo del mate' })
    const headings = within(stage)
      .getAllByText(/^\d{2} \/ 06 · /)
      .map((element) => element.textContent)
    expect(headings).toEqual([
      '01 / 06 · Las tres piezas',
      '02 / 06 · La calabaza',
      '03 / 06 · El bombillón',
      '04 / 06 · La yerba',
      '05 / 06 · El ritual',
      '06 / 06 · El cuero',
    ])
    expect(within(stage).getAllByRole('heading', { level: 2 })[0]).toHaveTextContent(
      'Tres piezas.Una ronda.',
    )
  })

  it('el raíl tiene una parada por escena y marca la primera como actual', () => {
    render(<StoryStage data={data} />)
    const rail = screen.getByRole('navigation', { name: 'Paradas del paseo' })
    const buttons = within(rail).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Las tres piezas',
      'La calabaza',
      'El bombillón',
      'La yerba',
      'El ritual',
      'El cuero',
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

  it('el mate muestra la pieza de la parada actual y la leyenda la nombra', () => {
    const { hero, bombillas, yerbas } = withPhotos(data).story
    render(<StoryStage data={withPhotos(data)} />)
    expect(shownPiece()).toBe(hero?.slug)
    goToStop(2)
    expect(shownPiece()).toBe(bombillas[0]?.slug)
    expect(screen.getByRole('button', { name: 'El bombillón' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('figure')).toHaveTextContent(bombillas[0]?.name ?? '')
    goToStop(3)
    expect(shownPiece()).toBe(yerbas[0]?.slug)
    goToStop(4)
    expect(shownPiece()).toBe(hero?.slug)
  })

  it('si la pieza de una parada no tiene foto, el mate sigue mostrando la última que tenía', () => {
    const withoutPhoto = withoutBombillaPhoto(data)
    render(<StoryStage data={withoutPhoto} />)
    expect(withoutPhoto.story.bombillas[0]?.mainImage).toBeNull()
    goToStop(2)
    expect(shownPiece()).toBe(withoutPhoto.story.hero?.slug)
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
