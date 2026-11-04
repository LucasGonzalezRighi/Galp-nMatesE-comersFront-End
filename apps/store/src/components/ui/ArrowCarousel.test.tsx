// @vitest-environment jsdom
import type { Mock } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanUpAfterEach, mockReducedMotion } from '../motion/test/support'
import { ArrowCarousel } from './ArrowCarousel'

cleanUpAfterEach()

afterEach(() => {
  vi.useRealTimers()
})

/** Las tarjetas de la prueba. */
const NAMES = ['Imperiales', 'Torpedos', 'Camioneros'] as const

/** Margen de la fila: la primera tarjeta arranca acá. */
const INSET = 24

/** Ancho de cada tarjeta más el espacio entre tarjetas. */
const STEP = 460

/** Lo que devuelve {@link renderCarousel}. */
interface CarouselView {
  /** La fila que se desliza. */
  track: HTMLElement
  /** Flecha "anterior". */
  previous: HTMLElement
  /** Flecha "siguiente". */
  next: HTMLElement
  /** El `scrollTo` simulado de la fila. */
  scrollTo: Mock
  /** La región viva. */
  status: HTMLElement
}

/** Dibuja el carrusel con tres tarjetas y simula las medidas que jsdom no calcula. */
function renderCarousel(): CarouselView {
  render(
    <ArrowCarousel
      label="Líneas de producto"
      itemLabel="línea"
      prevLabel="Línea anterior"
      nextLabel="Línea siguiente"
      header={<h2>Seis líneas para cada ronda</h2>}
    >
      {NAMES.map((name) => (
        <article key={name}>{name}</article>
      ))}
    </ArrowCarousel>,
  )
  const next = screen.getByRole('button', { name: 'Línea siguiente' })
  const previous = screen.getByRole('button', { name: 'Línea anterior' })
  const track = document.getElementById(next.getAttribute('aria-controls') ?? '')
  const status = document.querySelector<HTMLElement>('[aria-live="polite"]')
  if (track === null || status === null) throw new Error('Falta la fila o la región viva.')
  const scrollTo = vi.fn()
  Object.defineProperty(track, 'scrollTo', { configurable: true, value: scrollTo })
  Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1500 })
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: 600 })
  within(track)
    .getAllByRole('group')
    .forEach((item, index) => {
      Object.defineProperty(item, 'offsetLeft', { configurable: true, value: INSET + index * STEP })
    })
  return { track, previous, next, scrollTo, status }
}

describe('ArrowCarousel', () => {
  it('es una región con nombre; las flechas controlan la fila y cada tarjeta dice su posición', () => {
    mockReducedMotion(false)
    const { track, previous, next } = renderCarousel()
    const region = screen.getByRole('region', { name: 'Líneas de producto' })
    expect(
      within(region).getByRole('heading', { name: 'Seis líneas para cada ronda' }),
    ).toBeVisible()
    expect(previous).toHaveAttribute('aria-controls', track.id)
    expect(next).toHaveAttribute('aria-controls', track.id)
    const items = within(track).getAllByRole('group')
    expect(items).toHaveLength(3)
    expect(items[1]).toHaveAttribute('aria-roledescription', 'línea')
    expect(items[1]).toHaveAccessibleName('2 de 3')
    expect(within(items[1] ?? track).getByText('Torpedos')).toBeVisible()
    expect(screen.getByText('01 / 03')).toBeVisible()
  })

  it('la flecha siguiente corre la fila suave hasta la próxima tarjeta', () => {
    mockReducedMotion(false)
    const { next, scrollTo } = renderCarousel()
    fireEvent.click(next)
    expect(scrollTo).toHaveBeenCalledWith({ left: STEP, behavior: 'smooth' })
    expect(screen.getByText('02 / 03')).toBeVisible()
  })

  it('da la vuelta: antes de la primera va a la última y después de la última, a la primera', () => {
    mockReducedMotion(false)
    const { previous, next, scrollTo } = renderCarousel()
    fireEvent.click(previous)
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 2 * STEP, behavior: 'smooth' })
    expect(screen.getByText('03 / 03')).toBeVisible()
    fireEvent.click(next)
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })
    expect(screen.getByText('01 / 03')).toBeVisible()
  })

  it('la región viva anuncia la posición después de tocar una flecha, no al montar', () => {
    mockReducedMotion(false)
    const { next, status } = renderCarousel()
    expect(status).toHaveTextContent('')
    fireEvent.click(next)
    expect(status).toHaveTextContent('2 de 3')
  })

  it('con menos movimiento la fila salta sin animar', () => {
    mockReducedMotion(true)
    const { next, scrollTo } = renderCarousel()
    fireEvent.click(next)
    expect(scrollTo).toHaveBeenCalledWith({ left: STEP, behavior: 'auto' })
  })

  it('al deslizar la fila con el dedo el contador sigue a la tarjeta del comienzo, sin anunciar', () => {
    vi.useFakeTimers()
    mockReducedMotion(false)
    const { track, status } = renderCarousel()
    track.scrollLeft = STEP + 10
    fireEvent.scroll(track)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('02 / 03')).toBeVisible()
    expect(status).toHaveTextContent('')
  })

  it('una flecha tocada justo al quedar quieta la fila no se pisa con la lectura del scroll anterior', () => {
    vi.useFakeTimers()
    mockReducedMotion(false)
    const { track, next } = renderCarousel()
    // La flecha corrió la fila hasta la segunda tarjeta y el último `scroll` acaba de llegar.
    fireEvent.click(next)
    track.scrollLeft = STEP
    fireEvent.scroll(track)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    // Otra flecha antes de que se lea la posición: el desplazamiento suave todavía no arrancó.
    fireEvent.click(next)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByText('03 / 03')).toBeVisible()
  })

  it('sin tarjetas lanza RangeError', () => {
    mockReducedMotion(false)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      render(
        <ArrowCarousel label="Combos" itemLabel="combo" prevLabel="Anterior" nextLabel="Siguiente">
          {[]}
        </ArrowCarousel>,
      ),
    ).toThrow(RangeError)
  })
})
