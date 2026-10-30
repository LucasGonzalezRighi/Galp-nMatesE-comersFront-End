// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { cleanUpAfterEach } from '../../components/motion/test/support'
import { FEATURED_EXIT, FeaturedExit } from './FeaturedExit'
import { ManifestoBackdrop } from './ManifestoBackdrop'
import { ManifestoEnter } from './ManifestoEnter'
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
        <p>Tarjeta 1</p>
        <p>Tarjeta 2</p>
      </FeaturedExit>,
    )
    // Cada tarjeta va en su capa (sube con su propio retraso) y las capas son las celdas de la grilla.
    const card = wrapperOf('Tarjeta 1')
    const grid = card.parentElement
    expect(grid).toHaveClass('grid')
    expect(grid?.children).toHaveLength(2)
    expect(wrapperOf('Tarjeta 2').parentElement).toBe(grid)
    // Antes de salir de pantalla está entera: opacidad 1, sin escala ni desplazamiento.
    expect(grid?.style.opacity).toBe('1')
    expect(grid?.style.transformOrigin).toMatch(/top/)
    expect(grid?.style.willChange).toBe('transform')
    expect(card.style.transform).toMatch(/^(none)?$/)
  })

  it('la salida se nota: se apaga del todo, se achica al 88 % y sube 120 px, más tarde abajo', () => {
    expect(FEATURED_EXIT.offset).toEqual(['end 90%', 'end 10%'])
    expect(FEATURED_EXIT.opacity).toEqual([1, 0])
    expect(FEATURED_EXIT.scale).toEqual([1, 0.88])
    expect(FEATURED_EXIT.y).toEqual([0, -120])
    // La última tarjeta (la segunda fila) arranca más tarde que la primera.
    expect(FEATURED_EXIT.lag).toBeGreaterThan(0)
    expect(FEATURED_EXIT.lag).toBeLessThanOrEqual(0.3)
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

  it('desde 1024 px la foto entra con zoom desde 1,25 y la sección se enciende (capa oscura en 1)', () => {
    mockMedia({ reduced: false, wide: true })
    const { container } = render(<ManifestoBackdrop />)
    const layer = container.querySelector<HTMLElement>('[data-manifesto-photo]')
    expect(layer?.style.transform).toMatch(/translateY\(-5%\)/)
    expect(layer?.style.transform).toMatch(/scale\(1\.25\)/)
    expect(layer?.style.willChange).toBe('transform')
    // La foto sobra arriba y abajo: el parallax nunca deja ver un borde aunque la escala llegue a 1.
    expect(layer).toHaveClass('-inset-y-[6%]')
    const shade = container.querySelector<HTMLElement>('[data-manifesto-shade]')
    expect(shade?.style.opacity).toBe('1')
    // La capa oscura va encima del velo.
    const veil = container.querySelector('[data-manifesto-veil]')
    expect(veil?.compareDocumentPosition(shade as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('por debajo de 1024 px la foto conserva el zoom suave y no hay capa oscura', () => {
    mockMedia({ reduced: false, wide: false })
    const { container } = render(<ManifestoBackdrop />)
    const layer = container.querySelector<HTMLElement>('[data-manifesto-photo]')
    expect(layer?.style.transform).toMatch(/scale\(1\.12\)/)
    expect(container.querySelector('[data-manifesto-shade]')).toBeNull()
  })

  it('con menos movimiento tampoco hay capa oscura', () => {
    mockMedia({ reduced: true, wide: true })
    const { container } = render(<ManifestoBackdrop />)
    expect(container.querySelector('[data-manifesto-shade]')).toBeNull()
  })
})

describe('ManifestoEnter', () => {
  it.each(STILL_CASES)('quieto y sin estilos en línea (%o)', (media) => {
    mockMedia(media)
    render(
      <ManifestoEnter className="flex">
        <p>Frase</p>
      </ManifestoEnter>,
    )
    const block = wrapperOf('Frase')
    expect(block).toHaveClass('flex')
    expect(block).not.toHaveAttribute('style')
  })

  it('con movimiento y desde 1024 px el texto espera abajo y apagado hasta entrar con el scroll', () => {
    mockMedia({ reduced: false, wide: true })
    render(
      <ManifestoEnter className="flex">
        <p>Frase</p>
      </ManifestoEnter>,
    )
    const block = wrapperOf('Frase')
    expect(block).toHaveClass('flex')
    expect(block.style.opacity).toBe('0')
    expect(block.style.transform).toMatch(/translateY\(96px\)/)
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
