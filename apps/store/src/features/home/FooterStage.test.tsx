// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFooterStage } from '../../components/layout/footer-rise'
import { cleanUpAfterEach } from '../../components/motion/test/support'
import { FooterStage } from './FooterStage'

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

/** Muestra si el pie sabe que hay reseñas quietas para pasarles por encima. */
function StageProbe(): ReactNode {
  return <output>{useFooterStage() ? 'con escenario' : 'sin escenario'}</output>
}

/** El elemento que envuelve las reseñas de prueba. */
function wrapperOfReviews(): HTMLElement {
  const wrapper = screen.getByText('Reseñas').parentElement
  if (wrapper === null) throw new Error('Falta el contenedor de las reseñas.')
  return wrapper
}

describe('FooterStage', () => {
  it.each([
    { reduced: true, wide: true },
    { reduced: false, wide: false },
  ])('sin movimiento las reseñas quedan en su lugar y el pie no las tapa (%o)', (media) => {
    mockMedia(media)
    const { container } = render(
      <>
        <FooterStage>
          <p>Reseñas</p>
        </FooterStage>
        <StageProbe />
      </>,
    )
    expect(container.querySelector('[data-footer-stage]')).toBeNull()
    expect(container.querySelector('.sticky')).toBeNull()
    expect(container.querySelector('[style]')).toBeNull()
    expect(screen.getByText('sin escenario')).toBeInTheDocument()
  })

  it('con movimiento y desde 1024 px las reseñas quedan quietas un alto de pie más', () => {
    mockMedia({ reduced: false, wide: true })
    render(
      <>
        <FooterStage>
          <p>Reseñas</p>
        </FooterStage>
        <StageProbe />
      </>,
    )
    const pinned = wrapperOfReviews()
    const stage = pinned.parentElement
    expect(stage).toHaveAttribute('data-footer-stage')
    expect(stage).toHaveClass('relative')
    // Una pantalla más el recorrido que el pie necesita para subir por encima.
    expect(stage?.style.height).toBe('calc(100svh + var(--footer-h, 0px))')
    expect(pinned).toHaveClass('sticky', 'top-0', 'h-svh', 'flex', 'flex-col', 'justify-center')
    // Antes de que el pie asome, nítidas: sin desenfoque ni escala.
    expect(pinned.style.filter).toBe('none')
    expect(pinned.style.transform).toMatch(/^(none)?$/)
    // El pie se entera de que tiene que subir por encima.
    expect(screen.getByText('con escenario')).toBeInTheDocument()
  })

  it('al desmontarse el pie vuelve a quedar en su lugar', () => {
    mockMedia({ reduced: false, wide: true })
    const { unmount } = render(
      <FooterStage>
        <p>Reseñas</p>
      </FooterStage>,
    )
    unmount()
    render(<StageProbe />)
    expect(screen.getByText('sin escenario')).toBeInTheDocument()
  })

  it('marca <html> mientras está montado y lo limpia al irse (Ruling MR-27: el inicio queda oculto, no desmontado)', () => {
    mockMedia({ reduced: false, wide: true })
    const root = document.documentElement
    const { unmount } = render(
      <FooterStage>
        <p>Reseñas</p>
      </FooterStage>,
    )
    // El pie sube solo con esta marca (footer.css), no con el `data-footer-stage` del DOM: con
    // Cache Components el inicio sigue en el documento, oculto, después de navegar a otra página.
    expect(root).toHaveAttribute('data-footer-rise')
    expect(root).toHaveAttribute('data-footer-home')
    unmount()
    expect(root).not.toHaveAttribute('data-footer-rise')
    expect(root).not.toHaveAttribute('data-footer-home')
  })

  it('en el celular el inicio marca <html> como inicio, pero el pie no sube', () => {
    mockMedia({ reduced: false, wide: false })
    const root = document.documentElement
    const { unmount } = render(
      <FooterStage>
        <p>Reseñas</p>
      </FooterStage>,
    )
    expect(root).toHaveAttribute('data-footer-home')
    expect(root).not.toHaveAttribute('data-footer-rise')
    unmount()
    expect(root).not.toHaveAttribute('data-footer-home')
  })
})
