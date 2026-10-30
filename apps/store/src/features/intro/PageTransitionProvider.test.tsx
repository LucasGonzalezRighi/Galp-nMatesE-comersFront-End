// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NavLinksList } from '../../components/layout/NavLinks'
import { cleanUpAfterEach, mockReducedMotion } from '../../components/motion/test/support'
import { HomeIntro } from './HomeIntro'
import { INTRO_TIMING } from './intro-state'
import { PageTransitionProvider } from './PageTransitionProvider'

/** Ruta y router simulados: cada prueba cambia la ruta; `push` queda registrado. */
const nav = vi.hoisted(() => ({ pathname: '/', push: vi.fn<(href: string) => void>() }))
vi.mock('next/navigation', () => {
  const router = { push: nav.push }
  return {
    usePathname: (): string => nav.pathname,
    useRouter: (): typeof router => router,
  }
})

cleanUpAfterEach()

/** Frena la navegación de verdad de un enlace (jsdom no la implementa). */
function preventNavigation(event: Event): void {
  event.preventDefault()
}

beforeEach(() => {
  mockReducedMotion(false)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  nav.push.mockClear()
  document.addEventListener('click', preventNavigation)
})

afterEach(() => {
  document.removeEventListener('click', preventNavigation)
  vi.useRealTimers()
})

/** Pone la ruta actual (la que lee `usePathname` y la de la ventana). */
function goTo(pathname: string): void {
  nav.pathname = pathname
  window.history.replaceState(null, '', pathname)
}

/** La capa de la intro o del telón, o `null` si no hay. */
function layer(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-intro]')
}

/** Avanza los relojes de mentira. */
function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

/** Espera a que lleguen los trazos del logo (se cargan con `import()`). */
async function settleImports(): Promise<void> {
  await act(async () => {
    await vi.dynamicImportSettled()
  })
}

/** El inicio: la intro y su contenido. */
function Home(): ReactNode {
  return (
    <>
      <HomeIntro />
      <main>
        <h1>Encontrá tu mate.</h1>
      </main>
    </>
  )
}

describe('intro del inicio', () => {
  it('tapa el inicio, traza, rellena, se abre como un libro y se desmonta en 5 s', async () => {
    goTo('/')
    render(
      <PageTransitionProvider>
        <Home />
      </PageTransitionProvider>,
    )
    expect(layer()).toHaveAttribute('data-mode', 'intro')
    expect(layer()).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando Galpón Mates')
    expect(document.querySelector('main')).toHaveAttribute('inert')

    await settleImports()
    expect(layer()).toHaveAttribute('data-phase', 'drawing')
    expect(layer()).toHaveAttribute('data-logo', 'draw')
    // Las dos mitades tienen su logo con los diez trazos (matecito y GALPÓN).
    expect(layer()?.querySelectorAll('.intro-logo')).toHaveLength(2)
    expect(layer()?.querySelectorAll('.intro-half-left .intro-stroke')).toHaveLength(10)

    advance(INTRO_TIMING.drawMs)
    expect(layer()).toHaveAttribute('data-phase', 'filling')
    advance(INTRO_TIMING.fillMs)
    expect(layer()).toHaveAttribute('data-phase', 'opening')
    advance(INTRO_TIMING.introOpenMs)
    expect(layer()).toBeNull()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('no se monta en las demás páginas', () => {
    goTo('/tienda')
    render(
      <PageTransitionProvider>
        <main>
          <h1>Todo el catálogo</h1>
        </main>
      </PageTransitionProvider>,
    )
    expect(layer()).toBeNull()
    expect(document.querySelector('[data-intro-cover]')).toBeNull()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
  })

  it('una tecla salta directo a la apertura y el foco queda donde estaba', async () => {
    goTo('/')
    render(
      <PageTransitionProvider>
        <button type="button">Afuera</button>
        <Home />
      </PageTransitionProvider>,
    )
    const outside = screen.getByRole('button', { name: 'Afuera' })
    outside.focus()
    await settleImports()
    advance(1000)
    expect(layer()).toHaveAttribute('data-phase', 'drawing')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(layer()).toHaveAttribute('data-phase', 'opening')
    expect(layer()).toHaveAttribute('data-logo', 'done')
    advance(INTRO_TIMING.introOpenMs)
    expect(layer()).toBeNull()
    expect(outside).toHaveFocus()
  })

  it('con menos movimiento no hay intro', async () => {
    mockReducedMotion(true)
    goTo('/')
    render(
      <PageTransitionProvider>
        <Home />
      </PageTransitionProvider>,
    )
    await settleImports()
    expect(layer()).toBeNull()
    expect(document.querySelector('[data-intro-cover]')).toBeNull()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
  })
})

describe('telón entre páginas', () => {
  /** El sitio con los links del encabezado y la página actual. */
  function Site({ page }: { page: ReactNode }): ReactNode {
    return (
      <PageTransitionProvider>
        <NavLinksList activeKey={null} />
        {page}
      </PageTransitionProvider>
    )
  }

  it('baja el telón, navega tapado y se abre como un libro cuando pinta la ruta nueva', () => {
    goTo('/')
    const { rerender } = render(<Site page={<main>Inicio</main>} />)

    const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'Tienda' }))
    expect(notPrevented).toBe(false)
    expect(layer()).toHaveAttribute('data-mode', 'page')
    expect(layer()).toHaveAttribute('data-phase', 'covering')
    // Hacia otra página, el logo ya está dibujado y relleno.
    expect(layer()).toHaveAttribute('data-logo', 'done')
    expect(nav.push).not.toHaveBeenCalled()

    advance(INTRO_TIMING.coverMs)
    expect(nav.push).toHaveBeenCalledWith('/tienda')
    expect(layer()).toHaveAttribute('data-phase', 'covering')

    goTo('/tienda')
    rerender(<Site page={<main>Tienda</main>} />)
    expect(layer()).toHaveAttribute('data-phase', 'opening')
    advance(INTRO_TIMING.pageOpenMs)
    expect(layer()).toBeNull()
  })

  it('mientras el telón tapa y se abre, `<html>` avisa que la página está tapada (sin PageEnter)', () => {
    const html = document.documentElement
    goTo('/')
    const { rerender } = render(<Site page={<main>Inicio</main>} />)
    expect(html).not.toHaveAttribute('data-page-covered')
    fireEvent.click(screen.getByRole('link', { name: 'Tienda' }))
    expect(html).toHaveAttribute('data-page-covered')
    advance(INTRO_TIMING.coverMs)
    goTo('/tienda')
    rerender(<Site page={<main>Tienda</main>} />)
    expect(html).toHaveAttribute('data-page-covered')
    advance(INTRO_TIMING.pageOpenMs)
    expect(html).not.toHaveAttribute('data-page-covered')
  })

  it('hacia el inicio baja sin logo y la intro lo dibuja antes de abrirse', async () => {
    goTo('/tienda')
    const { rerender } = render(<Site page={<main>Tienda</main>} />)

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }))
    expect(layer()).toHaveAttribute('data-phase', 'covering')
    expect(layer()).toHaveAttribute('data-logo', 'none')
    advance(INTRO_TIMING.coverMs)
    expect(nav.push).toHaveBeenCalledWith('/')

    goTo('/')
    rerender(<Site page={<Home />} />)
    await settleImports()
    expect(layer()).toHaveAttribute('data-mode', 'intro')
    expect(layer()).toHaveAttribute('data-phase', 'drawing')
  })

  it('mientras el telón se abre, un clic en el menú no se pierde: el link navega solo', () => {
    goTo('/')
    const { rerender } = render(<Site page={<main>Inicio</main>} />)
    fireEvent.click(screen.getByRole('link', { name: 'Tienda' }))
    advance(INTRO_TIMING.coverMs)
    goTo('/tienda')
    rerender(<Site page={<main>Tienda</main>} />)
    expect(layer()).toHaveAttribute('data-phase', 'opening')

    // El `body` escucha después que React y antes que la prueba frene la navegación real.
    const prevented: boolean[] = []
    const record = (event: Event): void => {
      prevented.push(event.defaultPrevented)
    }
    document.body.addEventListener('click', record)
    fireEvent.click(screen.getByRole('link', { name: 'Nosotros' }))
    document.body.removeEventListener('click', record)
    expect(prevented).toEqual([false])
    expect(layer()).toHaveAttribute('data-phase', 'opening')
    expect(nav.push).toHaveBeenCalledTimes(1)
  })

  it('precarga las imágenes del logo del telón cuando la página queda libre', () => {
    const requested: string[] = []
    class FakeImage {
      set src(value: string) {
        requested.push(value)
      }
    }
    vi.stubGlobal('Image', FakeImage)
    try {
      goTo('/tienda')
      render(<Site page={<main>Tienda</main>} />)
      expect(requested).toEqual([])
      advance(2000)
      expect(requested).toEqual(['/brand/galpon-mark.svg', '/brand/galpon-wordmark.svg'])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('un clic en la página actual no hace nada', () => {
    goTo('/tienda')
    render(<Site page={<main>Tienda</main>} />)
    fireEvent.click(screen.getByRole('link', { name: 'Tienda' }))
    advance(INTRO_TIMING.coverMs)
    expect(layer()).toBeNull()
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('un clic con Ctrl (nueva pestaña) o con menos movimiento navega sin telón', () => {
    goTo('/')
    render(<Site page={<main>Inicio</main>} />)
    fireEvent.click(screen.getByRole('link', { name: 'Tienda' }), { ctrlKey: true })
    expect(layer()).toBeNull()

    mockReducedMotion(true)
    fireEvent.click(screen.getByRole('link', { name: 'Nosotros' }))
    advance(INTRO_TIMING.coverMs)
    expect(layer()).toBeNull()
    expect(nav.push).not.toHaveBeenCalled()
  })
})
