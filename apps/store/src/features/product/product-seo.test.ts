import { describe, expect, it } from 'vitest'
import { DEFAULT_OG_IMAGE } from '@/lib/seo'
import {
  buildMissingProductMetadata,
  buildProductJsonLd,
  buildProductMetadata,
  serializeJsonLd,
} from './product-seo'
import { detail } from './test/support'

const SITE_URL = 'https://galponmates.test'

const photo = {
  publicId: 'galpon/productos/mate-imperial-premium',
  url: '/mock-images/mate-imperial-premium.jpg',
  width: 960,
  height: 1280,
  alt: 'Mate Imperial Premium con virola de alpaca',
}

describe('buildProductMetadata', () => {
  it('arma título, descripción, dirección canónica y datos para compartir con la foto principal', () => {
    const metadata = buildProductMetadata(detail({ images: [photo] }), SITE_URL)

    expect(metadata.title).toBe('Mate Imperial Premium')
    expect(metadata.description).toBe('Imperial con virola de alpaca.')
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/producto/mate-imperial-premium`)
    expect(metadata.openGraph).toMatchObject({
      url: `${SITE_URL}/producto/mate-imperial-premium`,
      images: [{ url: `${SITE_URL}/mock-images/mate-imperial-premium.jpg`, alt: photo.alt }],
    })
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
  })

  it('declara el nombre del sitio y el idioma, porque el openGraph de la ficha reemplaza al del layout', () => {
    const metadata = buildProductMetadata(detail({ images: [photo] }), SITE_URL)

    expect(metadata.openGraph).toMatchObject({ siteName: 'Galpón Mates', locale: 'es_AR' })
  })

  it('sin fotos comparte la imagen por omisión de la tienda y la tarjeta grande', () => {
    const metadata = buildProductMetadata(detail({ images: [] }), SITE_URL)

    expect(metadata.openGraph).toMatchObject({
      siteName: 'Galpón Mates',
      locale: 'es_AR',
      images: [DEFAULT_OG_IMAGE],
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [DEFAULT_OG_IMAGE],
    })
  })

  it('acorta una descripción larga cortando en una palabra y cerrando con "…"', () => {
    const description = `${'palabra '.repeat(40)}final`
    const metadata = buildProductMetadata(detail({ description }), SITE_URL)

    const shown = metadata.description ?? ''
    expect(shown.length).toBeLessThanOrEqual(160)
    expect(shown.endsWith('…')).toBe(true)
    expect(shown.endsWith(' …')).toBe(false)
  })

  it('lanza RangeError si el origen público está vacío', () => {
    expect(() => buildProductMetadata(detail(), '')).toThrow(RangeError)
  })
})

describe('buildMissingProductMetadata', () => {
  it('no se indexa', () => {
    expect(buildMissingProductMetadata()).toEqual({
      title: 'Producto no encontrado',
      robots: { index: false, follow: false },
    })
  })
})

describe('buildProductJsonLd', () => {
  it('describe el producto con su oferta en pesos, su disponibilidad y su valoración', () => {
    const data = buildProductJsonLd(detail({ images: [photo] }), SITE_URL)

    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Mate Imperial Premium',
      sku: 'N°07',
      category: 'Imperiales',
      url: `${SITE_URL}/producto/mate-imperial-premium`,
      brand: { '@type': 'Brand', name: 'Galpón Mates' },
      image: [`${SITE_URL}/mock-images/mate-imperial-premium.jpg`],
      offers: {
        '@type': 'Offer',
        price: 39999,
        priceCurrency: 'ARS',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.7, reviewCount: 3 },
    })
  })

  it('un producto agotado figura sin stock', () => {
    const data = buildProductJsonLd(detail({ isSoldOut: true, isPurchasable: false }), SITE_URL)

    expect(data).toMatchObject({ offers: { availability: 'https://schema.org/OutOfStock' } })
  })

  it('sin precio no lleva oferta, sin reseñas no lleva valoración y sin fotos no lleva imagen', () => {
    const data = buildProductJsonLd(
      detail({ priceArs: null, netPriceArs: null, rating: { average: 0, count: 0 }, images: [] }),
      SITE_URL,
    )

    expect(data).not.toHaveProperty('offers')
    expect(data).not.toHaveProperty('aggregateRating')
    expect(data).not.toHaveProperty('image')
  })

  it('redondea el promedio a un decimal', () => {
    const data = buildProductJsonLd(detail({ rating: { average: 4.6666, count: 3 } }), SITE_URL)

    expect(data).toMatchObject({ aggregateRating: { ratingValue: 4.7 } })
  })

  it('lanza RangeError si el origen público está vacío', () => {
    expect(() => buildProductJsonLd(detail(), '')).toThrow(RangeError)
  })
})

describe('serializeJsonLd', () => {
  it('escapa "<" para que un texto del producto no pueda cerrar el script', () => {
    const text = serializeJsonLd({ name: '</script><script>alert(1)</script>' })

    expect(text).not.toContain('<')
    expect(JSON.parse(text)).toEqual({ name: '</script><script>alert(1)</script>' })
  })
})
