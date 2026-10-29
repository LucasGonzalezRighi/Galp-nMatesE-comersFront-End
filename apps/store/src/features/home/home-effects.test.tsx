// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cleanUpAfterEach } from '../../components/motion/test/support'
import { FeaturedExit } from './FeaturedExit'
import { ManifestoBackdrop } from './ManifestoBackdrop'
import { PinnedStats } from './PinnedStats'

cleanUpAfterEach()

/** Lo que el navegador simulado responde a las consultas de medios. */
interface MediaState {
  /** Si el usuario pidió menos movimiento. */
  reduced: boolean
  /** Si la ventana mide 1024 px o más. */
  wide: boolean
}

/** Simula `window.matchMedia` con la preferencia de movimiento y el ancho de la ventana. */
function mockMedia({ reduced, wide }: MediaState): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches:
        (query.includes('prefers-reduced-motion') && reduced) ||
        (query.includes('min-width: 1024px') && wide),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

/** Los casos sin movimiento: menos movimiento pedido, o una ventana angosta. */
const STILL_CASES: readonly MediaState[] = [
  { reduced: true, wide: true },
  { reduced: false, wide: false },
]

/** El elemento que envuelve un texto de prueba. */
function wrapperOf(text: string): HTMLElement {
  const wrapper = screen.getByText(text).parentElement
  if (wrapper === null) throw new Error(`Falta el contenedor de "${text}".`)
  return wrapper
}

describe('FeaturedExit', () => {
  it.each(STILL_CASES)('quieta y sin estilos en línea (%o)', (media) => {
    mockMedia(media)
    render(
      <FeaturedExit className="grid">
        <p>Tarjeta</p>
      </FeaturedExit>,
    )
    const grid = wrapperOf('Tarjeta')
    expect(grid).toHaveClass('grid')
    expect(grid).not.toHaveAttribute('style')
  })

  it('con movimiento y desde 1024 px la grilla se despide desde arriba, ligada al scroll', () => {
    mockMedia({ reduced: false, wide: true })
    render(
      <FeaturedExit className="grid">
        <p>Tarjeta</p>
      </FeaturedExit>,
    )
    const grid = wrapperOf('Tarjeta')
    expect(grid).toHaveClass('grid')
    // Antes de salir de pantalla está entera: opacidad 1, sin escala ni desplazamiento.
    expect(grid.style.opacity).toBe('1')
    expect(grid.style.transformOrigin).toMatch(/top/)
    expect(grid.style.willChange).toBe('transform')
  })
})

describe('ManifestoBackdrop', () => {
  it('la foto del yerbal es decorativa y lleva el velo encima', () => {
    mockMedia({ reduced: true, wide: true })
    const { container } = render(<ManifestoBackdrop />)
    const image = container.querySelector('img')
    expect(decodeURIComponent(image?.getAttribute('src') ?? '')).toContain('/hero/world/yerbal.jpg')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('sizes', '100vw')
    // Un solo velo (el degradé): con otra capa encima la foto casi no se ve.
    expect(container.querySelectorAll('[data-manifesto-veil]')).toHaveLength(1)
  })

  it('con menos movimiento la foto queda quieta, sin transformación en línea', () => {
    mockMedia({ reduced: true, wide: true })
    const { container } = render(<ManifestoBackdrop />)
    const layer = container.querySelector('[data-manifesto-photo]')
    expect(layer).not.toBeNull()
    expect(layer).not.toHaveAttribute('style')
  })

  it('con movimiento la foto entra con zoom y parallax desde 1,12 y −6 %', () => {
    mockMedia({ reduced: false, wide: true })
    const { container } = render(<ManifestoBackdrop />)
    const layer = container.querySelector<HTMLElement>('[data-manifesto-photo]')
    expect(layer?.style.transform).toMatch(/translateY\(-6%\)/)
    expect(layer?.style.transform).toMatch(/scale\(1\.12\)/)
    expect(layer?.style.willChange).toBe('transform')
  })
})

describe('PinnedStats', () => {
  /** Dibuja la banda de cifras y el kit de prueba. */
  function renderStack(): { band: HTMLElement; kit: HTMLElement } {
    render(<PinnedStats stats={<p>Cifras</p>} kit={<p>Kit</p>} />)
    return { band: wrapperOf('Cifras'), kit: wrapperOf('Kit') }
  }

  it.each(STILL_CASES)('sin movimiento quedan apiladas, sin clavar (%o)', (media) => {
    mockMedia(media)
    const { band, kit } = renderStack()
    expect(band).not.toHaveClass('sticky')
    expect(band).not.toHaveAttribute('style')
    expect(kit).not.toHaveClass('z-10')
    expect(band.compareDocumentPosition(kit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('con movimiento y desde 1024 px la banda se clava y el kit sube por encima', () => {
    mockMedia({ reduced: false, wide: true })
    const { band, kit } = renderStack()
    expect(band).toHaveClass('sticky', 'top-0', 'z-0')
    expect(band.style.opacity).toBe('1')
    expect(kit).toHaveClass('relative', 'z-10', 'bg-background')
    expect(band.parentElement).toBe(kit.parentElement)
    expect(band.parentElement).toHaveClass('relative')
  })
})
