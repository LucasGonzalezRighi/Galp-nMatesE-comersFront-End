// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Combo, PublicSettings } from '@galpon/api-client'
import { createApiClient, getPublicSettings, listCombos } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { cleanUpAfterEach, installIntersectionObserver } from '../../components/motion/test/support'
import { HomeCombos } from './HomeCombos'

/** Los combos a la venta y los ajustes de la base simulada de fábrica. */
async function fixture(): Promise<{ combos: Combo[]; settings: PublicSettings }> {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const api = createApiClient({ baseUrl: 'http://localhost/api/mock/v1', fetch })
  const [combos, settings] = await Promise.all([listCombos(api), getPublicSettings(api)])
  return { combos, settings }
}

/**
 * Simula el ancho de la pantalla: desde 768 px (`wide`) o un celular. Siempre con menos movimiento,
 * así todo aparece sin esperar a una animación.
 */
function mockScreen(wide: boolean): void {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches:
      query.includes('prefers-reduced-motion') || (wide && query.includes('min-width: 768px')),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }))
}

cleanUpAfterEach()

beforeEach(() => {
  installIntersectionObserver()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

describe('HomeCombos', () => {
  it('sin combos no dibuja nada', async () => {
    mockScreen(true)
    const { settings } = await fixture()
    const { container } = render(<HomeCombos combos={[]} settings={settings} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('en escritorio, con hasta tres combos, los muestra en una grilla con el título y la bajada', async () => {
    mockScreen(true)
    const { combos, settings } = await fixture()
    render(<HomeCombos combos={combos.slice(0, 3)} settings={settings} />)

    const section = screen.getByRole('region', { name: 'Combos listos para cebar' })
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Combos listos para cebar',
    )
    expect(section).toHaveTextContent(
      'Mate y bombilla, o mate y yerba, elegidos para ir juntos y a precio cerrado.',
    )
    expect(within(section).getAllByRole('article')).toHaveLength(3)
    expect(within(section).queryByRole('button', { name: 'Combo siguiente' })).toBeNull()
    expect(section.querySelector('[data-combos-grid]')).not.toBeNull()
  })

  it('con más de tres combos usa el carrusel con flechas, también en escritorio', async () => {
    mockScreen(true)
    const { combos, settings } = await fixture()
    render(<HomeCombos combos={combos} settings={settings} />)

    const carousel = screen.getByRole('region', { name: 'Combos' })
    expect(within(carousel).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Combos listos para cebar',
    )
    expect(within(carousel).getByRole('button', { name: 'Combo anterior' })).toBeInTheDocument()
    expect(within(carousel).getByRole('button', { name: 'Combo siguiente' })).toBeInTheDocument()
    const slides = within(carousel).getAllByRole('group', { name: /^\d de 4$/ })
    expect(slides).toHaveLength(4)
    expect(slides[0]).toHaveAttribute('aria-roledescription', 'combo')
    expect(within(carousel).getAllByRole('article')).toHaveLength(4)
    expect(document.querySelector('[data-combos-grid]')).toBeNull()
  })

  it('en el celular siempre es un carrusel, aunque haya dos combos', async () => {
    mockScreen(false)
    const { combos, settings } = await fixture()
    render(<HomeCombos combos={combos.slice(0, 2)} settings={settings} />)

    const carousel = screen.getByRole('region', { name: 'Combos' })
    expect(within(carousel).getAllByRole('group', { name: /^\d de 2$/ })).toHaveLength(2)
    expect(within(carousel).getByRole('button', { name: 'Combo siguiente' })).toBeInTheDocument()
  })
})
