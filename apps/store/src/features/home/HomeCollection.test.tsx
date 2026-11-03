// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { HomeCollection } from './HomeCollection'
import { loadFixtureCatalog } from './test/fixture-catalog'

cleanUpAfterEach()

beforeEach(() => {
  installIntersectionObserver()
})

describe('HomeCollection', () => {
  it.each([false, true])(
    'no clava la página: es una fila con flechas (menos movimiento: %s)',
    async (reduced) => {
      mockReducedMotion(reduced)
      const data = buildHomeData(await loadFixtureCatalog())
      const { container } = render(<HomeCollection data={data} />)
      expect(container.querySelector('.hscroll-section, .hscroll-sticky')).toBeNull()
      expect(container.querySelector('[style*="sticky"]')).toBeNull()
      const region = screen.getByRole('region', { name: 'Líneas de producto' })
      expect(
        within(region).getByRole('heading', { level: 2, name: data.content.collection.title }),
      ).toBeInTheDocument()
      expect(within(region).getByRole('button', { name: 'Línea anterior' })).toBeInTheDocument()
      expect(within(region).getByRole('button', { name: 'Línea siguiente' })).toBeInTheDocument()
    },
  )

  it('cada línea y la tarjeta final "Ver todo el catálogo" siguen en la fila', async () => {
    mockReducedMotion(true)
    const data = buildHomeData(await loadFixtureCatalog())
    render(<HomeCollection data={data} />)
    const total = data.lines.length + 1
    const items = screen.getAllByRole('group')
    expect(items).toHaveLength(total)
    expect(items[0]).toHaveAttribute('aria-roledescription', 'línea')
    for (const line of data.lines) {
      expect(screen.getByRole('link', { name: line.name })).toBeInTheDocument()
    }
    expect(within(items[total - 1] ?? document.body).getByRole('link')).toHaveAttribute(
      'href',
      '/tienda',
    )
    expect(screen.getByText(`01 / ${String(total).padStart(2, '0')}`)).toBeInTheDocument()
  })
})
