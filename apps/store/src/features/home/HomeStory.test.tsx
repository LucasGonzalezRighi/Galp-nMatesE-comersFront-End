// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeData } from './home-data'
import { cleanUpAfterEach, installIntersectionObserver } from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { HomeHero } from './HomeHero'
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
  return <HomeStory hero={<HomeHero data={data} />} data={data} />
}

/** Nombre accesible de la sección del mate. */
const STAGE = { name: 'El mate' } as const

/** Nombre accesible del raíl. */
const RAIL = { name: 'Paradas del mate' } as const

/** Los títulos de las escenas apiladas. */
const STACKED_TITLES = ['Alpacay bronce.', 'Agua a 75 °C.Nunca hervida.']

/** Los títulos de nivel 2 que hay en la página. */
function sceneTitles(): (string | null)[] {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
}

describe('HomeStory', () => {
  it('en el servidor dibuja la portada y las dos escenas apiladas aunque la ventana sea ancha', () => {
    mockWindow({ wide: true, reduced: false })
    const html = renderToString(story())
    expect(html).toContain('home-hero')
    expect(html.match(/home-scene/g)).toHaveLength(2)
    expect(html).not.toContain('aria-label="El mate"')
    expect(html).not.toContain('<canvas')
  })

  it('desde 1024 × 700 y con movimiento, el cliente monta el mate 3D sin repetir la portada', () => {
    mockWindow({ wide: true, reduced: false })
    render(story())
    expect(screen.getByRole('region', STAGE)).toBeInTheDocument()
    expect(document.querySelector('.home-hero')).toBeNull()
    expect(document.querySelector('.home-scene')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
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
    expect(screen.getByRole('region', STAGE)).toBeInTheDocument()
    expect(errors).not.toHaveBeenCalled()
    container.remove()
  })

  it('por debajo de 1024 px quedan la portada y las dos escenas apiladas, sin raíl', () => {
    mockWindow({ wide: false, reduced: false })
    render(story())
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(screen.queryByRole('navigation', RAIL)).toBeNull()
    expect(document.querySelector('.home-hero')).not.toBeNull()
    expect(sceneTitles()).toEqual(STACKED_TITLES)
  })

  it('con ancho de escritorio pero menos de 700 px de alto quedan las escenas apiladas', () => {
    mockWindow({ wide: true, reduced: false, tall: false })
    render(story())
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(sceneTitles()).toEqual(STACKED_TITLES)
  })

  it('con prefers-reduced-motion quedan las escenas apiladas aunque la ventana sea ancha', () => {
    mockWindow({ wide: true, reduced: true })
    render(story())
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(document.querySelector('canvas')).toBeNull()
    expect(sceneTitles()).toEqual(STACKED_TITLES)
  })

  it('si al contenido le falta una de las dos escenas, el escritorio también las apila', () => {
    mockWindow({ wide: true, reduced: false })
    const scenes = data.content.scenes.filter((scene) => scene.key !== 'ritual')
    data = { ...data, content: { ...data.content, scenes } }
    render(story())
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(sceneTitles()).toEqual(['Alpacay bronce.'])
  })
})
