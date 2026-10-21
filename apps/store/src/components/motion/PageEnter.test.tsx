// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageCurtain } from './PageCurtain'
import { PageEnter } from './PageEnter'
import { cleanUpAfterEach, mockReducedMotion } from './test/support'

/** Ruta simulada: la prueba la cambia y vuelve a renderizar. */
const route = vi.hoisted(() => ({ pathname: '/', search: '' }))

vi.mock('next/navigation', () => ({
  usePathname: (): string => route.pathname,
  useSearchParams: (): URLSearchParams => new URLSearchParams(route.search),
}))

cleanUpAfterEach()

beforeEach(() => {
  route.pathname = '/'
  route.search = ''
})

describe('PageEnter', () => {
  it('no oculta ni anima el contenido en la primera carga', () => {
    mockReducedMotion(false)
    render(<PageEnter>Inicio</PageEnter>)
    expect(screen.getByText('Inicio')).toBeVisible()
  })

  it('vuelve a entrar (oculto y luego visible) al cambiar el pathname, sin remontar el contenido', async () => {
    mockReducedMotion(false)
    const { rerender } = render(
      <PageEnter>
        <input aria-label="Buscar" />
      </PageEnter>,
    )
    const input = screen.getByLabelText('Buscar')
    const box = input.parentElement
    route.pathname = '/tienda'
    rerender(
      <PageEnter>
        <input aria-label="Buscar" />
      </PageEnter>,
    )
    // El contenido sigue siendo el mismo nodo: no se volvió a montar.
    expect(screen.getByLabelText('Buscar')).toBe(input)
    await waitFor(() => {
      expect(box?.style.opacity).toBe('0')
    })
    await waitFor(() => {
      expect(box).toHaveStyle({ opacity: '1' })
    })
  })

  it('también entra de nuevo si cambia solo un parámetro de la URL', async () => {
    mockReducedMotion(false)
    const { rerender } = render(<PageEnter>Tienda</PageEnter>)
    route.search = 'orden=precio'
    rerender(<PageEnter>Tienda</PageEnter>)
    await waitFor(() => {
      expect(screen.getByText('Tienda').style.opacity).toBe('0')
    })
  })

  it('con prefers-reduced-motion el contenido nunca se oculta', async () => {
    mockReducedMotion(true)
    const { rerender } = render(<PageEnter>Tienda</PageEnter>)
    route.pathname = '/producto/x'
    rerender(<PageEnter>Tienda</PageEnter>)
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(screen.getByText('Tienda')).toBeVisible()
  })
})

describe('PageCurtain', () => {
  it('es decorativa: aria-hidden, sin captar clics, y muestra el logo que recibe', () => {
    mockReducedMotion(false)
    render(
      <PageCurtain>
        <span>logo</span>
      </PageCurtain>,
    )
    const curtain = screen.getByText('logo').parentElement
    expect(curtain).toHaveAttribute('aria-hidden', 'true')
    expect(curtain).toHaveStyle({ pointerEvents: 'none', position: 'fixed' })
  })

  it('al cambiar el pathname recorre la pantalla; con solo un parámetro no', async () => {
    mockReducedMotion(false)
    const { rerender } = render(<PageCurtain>c</PageCurtain>)
    const curtain = screen.getByText('c')
    const start = curtain.style.transform
    route.search = 'q=mate'
    rerender(<PageCurtain>c</PageCurtain>)
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(curtain.style.transform).toBe(start)
    route.pathname = '/tienda'
    rerender(<PageCurtain>c</PageCurtain>)
    await waitFor(() => {
      expect(curtain.style.transform).not.toBe(start)
    })
  })

  it('con prefers-reduced-motion no se dibuja', () => {
    mockReducedMotion(true)
    render(<PageCurtain>logo</PageCurtain>)
    expect(screen.queryByText('logo')).toBeNull()
  })
})
