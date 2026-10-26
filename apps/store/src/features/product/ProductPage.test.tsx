// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getProductMetadata, getProductParams, PRODUCT_PLACEHOLDER_SLUG } from './product.route'
import { ProductPage } from './ProductPage'
import { useFreshTestApi } from './test/support'

const SITE_URL = vi.hoisted(() => 'https://galponmates.test')

// Las lecturas del servidor ('use cache' y 'server-only') no corren en las pruebas: se simulan.
vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }))
vi.mock('../../lib/api.server', async () => {
  const { currentTestApi: api } = await import('./test/support')
  return { getServerApi: api }
})

// El origen público sale del entorno del servidor, que en jsdom (con `window`) no se puede leer.
vi.mock('../../lib/env', () => ({ getStoreEnv: () => ({ siteUrl: SITE_URL }) }))

// La ficha tiene botones que navegan: necesitan el router de Next.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

beforeEach(() => {
  useFreshTestApi()
})

afterEach(() => {
  cleanup()
})

describe('ProductPage', () => {
  it('arma la ficha completa: título, datos estructurados, reseñas y relacionados', async () => {
    const { container } = render(await ProductPage({ slug: 'mate-imperial-premium' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mate Imperial Premium')
    expect(screen.getByRole('heading', { name: 'Más para la ronda' })).toBeInTheDocument()
    expect(document.getElementById('resenas')).not.toBeNull()
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(JSON.parse(script?.textContent ?? '{}')).toMatchObject({
      '@type': 'Product',
      name: 'Mate Imperial Premium',
    })
  })

  it('un producto que no existe responde notFound()', async () => {
    await expect(ProductPage({ slug: 'no-existe' })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
  })

  it('un slug raro (mayúsculas, "..", "%") responde notFound() y no un error', async () => {
    for (const slug of [
      'Mate-Imperial-Premium',
      '..',
      '%',
      '%E0%A4%A',
      '<script>alert(1)</script>',
    ]) {
      await expect(ProductPage({ slug })).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })
    }
  })

  it('el slug de relleno también responde notFound()', async () => {
    await expect(ProductPage({ slug: PRODUCT_PLACEHOLDER_SLUG })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
  })

  it('un slug anterior redirige de forma permanente (308) al actual', async () => {
    const { db } = useFreshTestApi()
    const stored = db.products.find((item) => item.slug === 'mate-imperial-premium')
    if (stored === undefined) throw new Error('Falta el producto')
    stored.previousSlugs = ['imperial-viejo']
    await expect(ProductPage({ slug: 'imperial-viejo' })).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/producto/mate-imperial-premium;308;',
    })
  })
})

describe('generateStaticParams y metadatos', () => {
  it('devuelve un parámetro por cada producto publicado', async () => {
    const params = await getProductParams()
    expect(params).toContainEqual({ slug: 'mate-imperial-premium' })
    expect(params).not.toContainEqual({ slug: PRODUCT_PLACEHOLDER_SLUG })
  })

  it('con un producto publicado, el título y la dirección canónica son los suyos', async () => {
    const metadata = await getProductMetadata('mate-imperial-premium')
    expect(metadata.title).toBe('Mate Imperial Premium')
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/producto/mate-imperial-premium`)
  })

  it('un producto que no existe (o un slug inválido) lleva noindex', async () => {
    for (const slug of ['no-existe', 'Raro', '..']) {
      expect(await getProductMetadata(slug)).toMatchObject({
        title: 'Producto no encontrado',
        robots: { index: false, follow: false },
      })
    }
  })
})
