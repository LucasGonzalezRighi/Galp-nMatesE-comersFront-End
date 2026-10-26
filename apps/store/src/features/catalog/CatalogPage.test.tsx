// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, ProductSummary, PublicSettings } from '@galpon/api-client'
import { getCategories } from '../../lib/data/catalog'
import { getPublicSettings } from '../../lib/data/settings'
import { CATALOG_PLACEHOLDER_LINE } from './catalog-scope'
import { getCatalogProducts } from './catalog.data'
import { getCatalogLineParams, getCatalogMetadata } from './catalog.route'
import { CatalogPage } from './CatalogPage'

// Las lecturas del servidor ('use cache' y 'server-only') no corren en las pruebas: se simulan.
vi.mock('../../lib/data/catalog', () => ({ getCategories: vi.fn() }))
vi.mock('../../lib/data/settings', () => ({ getPublicSettings: vi.fn() }))
vi.mock('./catalog.data', () => ({ getCatalogProducts: vi.fn() }))

// `notFound` es el de Next.js; el catálogo del navegador necesita la dirección y el router.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useSearchParams: (): URLSearchParams => new URLSearchParams(),
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

const categories: Category[] = [
  {
    id: 'cat-imperiales',
    slug: 'imperiales',
    name: 'Imperiales',
    blurb: 'El mate de ceremonia.',
    group: 'mate',
    image: null,
    position: 1,
    productCount: 1,
  },
  {
    id: 'cat-yerbas',
    slug: 'yerbas',
    name: 'Yerbas',
    blurb: '',
    group: 'yerba',
    image: null,
    position: 2,
    productCount: 0,
  },
]

const imperial: ProductSummary = {
  id: 'imperial-premium',
  categoryId: 'cat-imperiales',
  categoryName: 'Imperiales',
  categorySlug: 'imperiales',
  code: 'N°01',
  description: 'Imperial con virola de alpaca.',
  featured: true,
  group: 'mate',
  isPurchasable: true,
  isSoldOut: false,
  mainImage: null,
  maxQuantity: 10,
  name: 'Mate Imperial Premium',
  netPriceArs: 33057,
  priceArs: 39999,
  rating: { average: 0, count: 0 },
  slug: 'imperial-premium',
}

const publicSettings: PublicSettings = {
  contactEmail: 'galpon.mates@gmail.com',
  installments: { maxWithoutInterest: 3, showOnProduct: true },
  kitDiscountPercent: 15,
  priceDisplay: { showNetPrice: true },
  seller: {
    address: null,
    cuit: null,
    dataFiscalUrl: null,
    legalName: null,
    phone: null,
    supportArea: null,
    supportHours: null,
    taxCondition: null,
  },
  shippingOptions: [],
}

beforeEach(() => {
  vi.mocked(getCategories).mockResolvedValue(categories)
  vi.mocked(getCatalogProducts).mockResolvedValue([imperial])
  vi.mocked(getPublicSettings).mockResolvedValue(publicSettings)
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('CatalogPage', () => {
  it('arma la tienda completa con las líneas, el catálogo y los ajustes', async () => {
    render(await CatalogPage({ lineSlug: null }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Todo el catálogo')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Mate Imperial Premium')
    expect(screen.getByText('Armando el kit tenés −15% sobre el total.')).toBeInTheDocument()
  })

  it('una línea existente muestra su título y sus productos', async () => {
    render(await CatalogPage({ lineSlug: 'imperiales' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Imperiales')
    expect(screen.getByText('El mate de ceremonia.')).toBeInTheDocument()
  })

  it('una línea inexistente responde notFound()', async () => {
    await expect(CatalogPage({ lineSlug: 'no-existe' })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
  })

  it('un slug raro (mayúsculas, "..", "%") responde notFound() y no un error', async () => {
    for (const lineSlug of ['Imperiales', '..', '%', '%E0%A4%A']) {
      await expect(CatalogPage({ lineSlug })).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })
    }
  })

  it('la línea de relleno de generateStaticParams también responde notFound()', async () => {
    await expect(CatalogPage({ lineSlug: CATALOG_PLACEHOLDER_LINE })).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
  })
})

describe('generateStaticParams y metadatos', () => {
  it('devuelve una línea por parámetro, o la de relleno si no hay ninguna', async () => {
    expect(await getCatalogLineParams()).toEqual([{ linea: 'imperiales' }, { linea: 'yerbas' }])
    vi.mocked(getCategories).mockResolvedValue([])
    expect(await getCatalogLineParams()).toEqual([{ linea: CATALOG_PLACEHOLDER_LINE }])
  })

  it('el título es "Tienda" o el de la línea, con su bajada', async () => {
    expect(await getCatalogMetadata(null)).toMatchObject({ title: 'Tienda' })
    expect(await getCatalogMetadata('imperiales')).toEqual({
      title: 'Imperiales · Tienda',
      description: 'El mate de ceremonia.',
    })
    expect((await getCatalogMetadata('yerbas')).description).toBe(
      'Mates, bombillones y yerba. Elegí, sumá al carrito y pagá online.',
    )
    expect(await getCatalogMetadata('no-existe')).toEqual({})
  })
})
