// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageCurtain } from './PageCurtain'
import { PageEnter } from './PageEnter'
import { firstPathSegment } from './route-watchers'
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
    // Temporizadores falsos (también `requestAnimationFrame` y `performance`): la entrada dura
    // 0,98 s y con el reloj real dependía de la carga de la máquina.
    vi.useFakeTimers()
    try {
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
      // Dentro del retardo de 180 ms queda oculto; al terminar, visible.
      await act(() => vi.advanceTimersByTimeAsync(100))
      expect(box?.style.opacity).toBe('0')
      await act(() => vi.advanceTimersByTimeAsync(1500))
      expect(box).toHaveStyle({ opacity: '1' })
    } finally {
      vi.useRealTimers()
    }
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

  it('al cambiar de sección recorre la pantalla; con un parámetro o dentro de la sección no', async () => {
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

  it('no sale al pasar de /tienda a /tienda/bombillones, pero sí a /kit', async () => {
    mockReducedMotion(false)
    route.pathname = '/tienda'
    const { rerender } = render(<PageCurtain>c</PageCurtain>)
    const curtain = screen.getByText('c')
    const start = curtain.style.transform
    route.pathname = '/tienda/bombillones'
    rerender(<PageCurtain>c</PageCurtain>)
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(curtain.style.transform).toBe(start)
    route.pathname = '/kit'
    rerender(<PageCurtain>c</PageCurtain>)
    await waitFor(() => {
      expect(curtain.style.transform).not.toBe(start)
    })
  })

  it('firstPathSegment devuelve la sección de la ruta', () => {
    expect(firstPathSegment('/')).toBe('')
    expect(firstPathSegment('/tienda')).toBe('tienda')
    expect(firstPathSegment('/tienda/bombillones')).toBe('tienda')
  })

  it('con prefers-reduced-motion no se dibuja', () => {
    mockReducedMotion(true)
    render(<PageCurtain>logo</PageCurtain>)
    expect(screen.queryByText('logo')).toBeNull()
  })
})
