// @vitest-environment jsdom

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

cleanUpAfterEach()

/** Simula la ventana: ancho de escritorio o no, y la preferencia de movimiento. */
function mockWindow({ wide, reduced }: { wide: boolean; reduced: boolean }): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): Partial<MediaQueryList> => ({
      matches: query.includes('min-width') ? wide : reduced && query.includes('reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  })
}

let data: HomeData

beforeEach(async () => {
  installIntersectionObserver()
  data = buildHomeData(await loadFixtureCatalog())
})

/** Nombre accesible de la sección del paseo. */
const STAGE = { name: 'El paseo del mate' } as const

describe('HomeStory', () => {
  it('en el servidor dibuja las escenas apiladas aunque la ventana sea ancha', () => {
    mockWindow({ wide: true, reduced: false })
    const html = renderToString(<HomeStory data={data} />)
    expect(html).toContain('home-scene')
    expect(html).not.toContain('El paseo del mate')
    expect(html).toContain('Tres piezas.')
  })

  it('desde 1024 px y con movimiento, el cliente monta el paseo del mate', () => {
    mockWindow({ wide: true, reduced: false })
    render(<HomeStory data={data} />)
    expect(screen.getByRole('region', STAGE)).toBeInTheDocument()
    expect(document.querySelector('.home-scene')).toBeNull()
  })

  it('al hidratar el HTML del servidor pasa al paseo sin diferencias de hidratación', async () => {
    mockWindow({ wide: true, reduced: false })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const container = document.createElement('div')
    container.innerHTML = renderToString(<HomeStory data={data} />)
    document.body.append(container)
    await act(async () => {
      hydrateRoot(container, <HomeStory data={data} />)
      await Promise.resolve()
    })
    expect(screen.getByRole('region', STAGE)).toBeInTheDocument()
    expect(errors).not.toHaveBeenCalled()
    container.remove()
  })

  it('por debajo de 1024 px quedan las escenas apiladas, sin raíl', () => {
    mockWindow({ wide: false, reduced: false })
    render(<HomeStory data={data} />)
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Paradas del paseo' })).toBeNull()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6)
  })

  it('con prefers-reduced-motion quedan las escenas apiladas aunque la ventana sea ancha', () => {
    mockWindow({ wide: true, reduced: true })
    render(<HomeStory data={data} />)
    expect(screen.queryByRole('region', STAGE)).toBeNull()
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6)
  })
})
