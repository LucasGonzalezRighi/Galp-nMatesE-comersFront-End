// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeData } from './home-data'
import { cleanUpAfterEach, installIntersectionObserver } from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { HomeStory } from './HomeStory'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** Navegación simulada: las filas de producto llevan a la ficha con el router de Next. */
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

// jsdom no tiene WebGL: la escena del mate no se crea (acá se prueba qué se monta, no la escena).
vi.mock('./mate3d/scene', () => ({ createMateScene: vi.fn() }))

cleanUpAfterEach()

/** Opciones de {@link mockWindow}. */
interface WindowOptions {
  /** Si la ventana tiene ancho de escritorio (1024 px o más). */
  wide: boolean
  /** Si la preferencia de movimiento es `reduce`. */
  reduced: boolean
  /** Si la ventana tiene el alto que pide el escenario (700 px o más); por omisión sí. */
  tall?: boolean
}

/** Simula la ventana: ancho de escritorio o no, alto suficiente o no, y la preferencia de movimiento. */
function mockWindow({ wide, reduced, tall = true }: WindowOptions): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): Partial<MediaQueryList> => ({
      matches: query.includes('min-width')
        ? wide && (tall || !query.includes('min-height'))
        : reduced && query.includes('reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
}

let data: HomeData

beforeEach(async () => {
  installIntersectionObserver()
  // Sin contexto WebGL, como jsdom; así el lienzo no pide uno al navegador simulado.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  data = buildHomeData(await loadFixtureCatalog())
})

/** El inicio hasta la colección, como lo arma `HomePage`. */
function story(): ReactNode {
  return <HomeStory data={data} slides={data.heroSlides} />
}

/** Nombre accesible de la sección del mate. */
const STAGE = { name: 'El mate' } as const

/** Nombre accesible del raíl. */
const RAIL = { name: 'Paradas del mate' } as const

/** El carrusel del v4, si está. */
function carousel(): Element | null {
  return document.querySelector('[data-hero-carousel]')
}

/** Ninguna escena apilada (la bombilla y el agua de antes) queda en la página. */
function expectNoStackedScenes(): void {
  expect(document.querySelector('.home-scene')).toBeNull()
  expect(document.querySelector('.home-hero')).toBeNull()
  expect(screen.queryByText('Alpaca')).toBeNull()
}

describe('HomeStory', () => {
  it('en el servidor dibuja el carrusel del v4 aunque la ventana sea ancha, sin escenas ni lienzo', () => {
    mockWindow({ wide: true, reduced: false })
    const html = renderToString(story())
    expect(html).toContain('data-hero-carousel')
    expect(html).not.toContain('home-scene')
    expect(html).not.toContain('aria-label="El mate"')
    expect(html).not.toContain('<canvas')
  })

  it('desde 1024 × 700 y con movimiento, el cliente monta el mate 3D en lugar del carrusel', async () => {
    mockWindow({ wide: true, reduced: false })
    render(story())
    expect(await screen.findByRole('region', STAGE)).toBeInTheDocument()
    expect(carousel()).toBeNull()
    expect(document.querySelector('.home-scene')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('mientras baja el código del mate 3D no se ve el carrusel: queda un lugar vacío del alto del escenario', async () => {
    mockWindow({ wide: true, reduced: false })
    // Un `HomeStory` recién importado: su mate 3D todavía no bajó (las pruebas anteriores ya lo cargaron).
    vi.resetModules()
    const { HomeStory: FreshStory } = await import('./HomeStory')
    render(<FreshStory data={data} slides={data.heroSlides} />)
    expect(carousel()).toBeNull()
    expect(document.querySelector('[data-stage-pending]')).toHaveStyle({ height: '400svh' })
    expect(await screen.findByRole('region', STAGE)).toBeInTheDocument()
    expect(document.querySelector('[data-stage-pending]')).toBeNull()
  })

  it('al hidratar el HTML del servidor pasa al mate 3D sin diferencias de hidratación', async () => {
    mockWindow({ wide: true, reduced: false })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const container = document.createElement('div')
    container.innerHTML = renderToString(story())
    document.body.append(container)
    await act(async () => {
      hydrateRoot(container, story())
      await Promise.resolve()
    })
    expect(await screen.findByRole('region', STAGE)).toBeInTheDocument()
    expect(carousel()).toBeNull()
    expect(errors).not.toHaveBeenCalled()
    container.remove()
  })

  it('por debajo de 1024 px queda el carrusel, sin raíl ni escenas apiladas', () => {
    mockWindow({ wide: false, reduced: false })
    render(story())
    expect(carousel()).not.toBeNull()
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(screen.queryByRole('navigation', RAIL)).toBeNull()
    expectNoStackedScenes()
  })

  it('con ancho de escritorio pero menos de 700 px de alto queda el carrusel', () => {
    mockWindow({ wide: true, reduced: false, tall: false })
    render(story())
    expect(carousel()).not.toBeNull()
    expect(screen.queryByRole('region', STAGE)).toBeNull()
  })

  it('con prefers-reduced-motion queda el carrusel aunque la ventana sea ancha', () => {
    mockWindow({ wide: true, reduced: true })
    render(story())
    expect(carousel()).not.toBeNull()
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('si al contenido le falta una de las dos escenas, el escritorio también muestra el carrusel', () => {
    mockWindow({ wide: true, reduced: false })
    const scenes = data.content.scenes.filter((scene) => scene.key !== 'ritual')
    data = { ...data, content: { ...data.content, scenes } }
    render(story())
    expect(carousel()).not.toBeNull()
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expectNoStackedScenes()
  })
})
