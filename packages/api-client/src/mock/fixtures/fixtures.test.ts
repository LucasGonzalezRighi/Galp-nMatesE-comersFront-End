import { describe, expect, it } from 'vitest'
import { slugify } from '@galpon/domain'
import { settingsFormSchema } from '@galpon/schemas'
import {
  FIXTURE_CATEGORIES,
  FIXTURE_CONTENT,
  FIXTURE_PRODUCTS,
  FIXTURE_REVIEWS,
  FIXTURE_SETTINGS,
} from '.'

const PRODUCT_IDS = new Set(FIXTURE_PRODUCTS.map((product) => product.id))

describe('fixtures del diseño: catálogo', () => {
  it('tiene 6 líneas y 27 productos', () => {
    expect(FIXTURE_CATEGORIES).toHaveLength(6)
    expect(FIXTURE_PRODUCTS).toHaveLength(27)
  })

  it('las líneas salen del diseño: slug sin prefijo, posición de 1 a 6 y foto solo en imperiales', () => {
    expect(FIXTURE_CATEGORIES.map((category) => category.slug)).toEqual([
      'imperiales',
      'torpedos',
      'camioneros',
      'ranchero',
      'bombillones',
      'yerbas',
    ])
    for (const category of FIXTURE_CATEGORIES) {
      expect(category.id).toBe(`cat-${category.slug}`)
    }
    expect(FIXTURE_CATEGORIES.map((category) => category.position)).toEqual([1, 2, 3, 4, 5, 6])
    const withImage = FIXTURE_CATEGORIES.filter((category) => category.image !== null)
    expect(withImage.map((category) => category.slug)).toEqual(['imperiales'])
  })

  it('los slugs son únicos e iguales a slugify(name)', () => {
    const slugs = FIXTURE_PRODUCTS.map((product) => product.slug)
    expect(new Set(slugs).size).toBe(27)
    for (const product of FIXTURE_PRODUCTS) {
      expect(product.slug).toBe(slugify(product.name))
    }
    expect(slugs).toContain('mate-imperial-premium')
    expect(slugs).toContain('yerba-canarias-te-y-jengibre-1-kg')
    expect(slugs).toContain('bombillon-mini-premium-pico-loro-15-cm')
  })

  it('el código de secuencia va de 1 a 27 en el orden del diseño', () => {
    expect(FIXTURE_PRODUCTS.map((product) => product.sequence)).toEqual(
      Array.from({ length: 27 }, (_, index) => index + 1),
    )
    expect(FIXTURE_PRODUCTS[0]?.id).toBe('prd-imperial-premium')
    expect(FIXTURE_PRODUCTS[26]?.id).toBe('prd-bombillon-loro-18')
  })

  it('cada producto apunta a una línea que existe', () => {
    const categoryIds = new Set(FIXTURE_CATEGORIES.map((category) => category.id))
    for (const product of FIXTURE_PRODUCTS) {
      expect(categoryIds.has(product.categoryId)).toBe(true)
    }
  })

  it('hay 8 destacados', () => {
    expect(FIXTURE_PRODUCTS.filter((product) => product.featured)).toHaveLength(8)
  })

  it('el único sin precio es el torpedo de acero y la galleta no tiene stock', () => {
    const withoutPrice = FIXTURE_PRODUCTS.filter((product) => product.priceArs === null)
    expect(withoutPrice.map((product) => product.id)).toEqual(['prd-torpedo-acero'])
    const stockOf = (id: string) => FIXTURE_PRODUCTS.find((product) => product.id === id)?.stock
    expect(stockOf('prd-galleta')).toBe(0)
    expect(stockOf('prd-coquito-criollo')).toBe(2)
    expect(stockOf('prd-imperial-premium')).toBe(12)
  })

  it('todos están publicados, sin slugs viejos ni ajustes de pestañas, y solo el imperial premium tiene foto', () => {
    for (const product of FIXTURE_PRODUCTS) {
      expect(product.status).toBe('published')
      expect(product.previousSlugs).toEqual([])
      expect(product.tabsOverride).toBeNull()
    }
    const withImages = FIXTURE_PRODUCTS.filter((product) => product.images.length > 0)
    expect(withImages.map((product) => product.id)).toEqual(['prd-imperial-premium'])
    expect(withImages[0]?.images).toEqual([
      {
        publicId: 'galpon/productos/mate-imperial-premium',
        url: '/mock-images/mate-imperial-premium.jpg',
        width: 960,
        height: 1280,
        alt: 'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce',
      },
    ])
  })
})

describe('fixtures del diseño: reseñas', () => {
  it('cada reseña apunta a un producto que existe y todas están aprobadas y verificadas', () => {
    expect(FIXTURE_REVIEWS).toHaveLength(13)
    expect(new Set(FIXTURE_REVIEWS.map((review) => review.id)).size).toBe(13)
    for (const review of FIXTURE_REVIEWS) {
      expect(PRODUCT_IDS.has(review.productId)).toBe(true)
      expect(review.status).toBe('approved')
      expect(review.verifiedPurchase).toBe(true)
      expect(review.createdAt).toMatch(/^2026-0[6-9]-15T15:00:00Z$/)
    }
  })

  it('el mes del diseño pasa a una fecha ISO con hora y zona', () => {
    const first = FIXTURE_REVIEWS.find((review) => review.productId === 'prd-imperial-premium')
    expect(first?.authorName).toBe('Martina R.')
    expect(first?.createdAt).toBe('2026-09-15T15:00:00Z')
    const monthsOf = (productId: string) =>
      FIXTURE_REVIEWS.filter((review) => review.productId === productId).map((review) =>
        review.createdAt.slice(0, 7),
      )
    expect(monthsOf('prd-imperial-premium')).toEqual(['2026-09', '2026-08', '2026-07'])
    expect(monthsOf('prd-torpedo-premium')).toEqual(['2026-09', '2026-06'])
  })

  it('hay 3 destacadas: la primera del imperial premium, del bombillón premium curvo y del camionero con pelo', () => {
    const featured = FIXTURE_REVIEWS.filter((review) => review.featured)
    expect(featured.map((review) => review.productId)).toEqual([
      'prd-imperial-premium',
      'prd-camionero-pelo',
      'prd-bombillon-premium-curvo',
    ])
    expect(featured.map((review) => review.authorName)).toEqual([
      'Martina R.',
      'Ignacio L.',
      'Federico A.',
    ])
  })
})

describe('fixtures del diseño: contenido y ajustes', () => {
  it('cada slug de storyProducts existe', () => {
    const slugs = new Set(FIXTURE_PRODUCTS.map((product) => product.slug))
    const { hero, bombillas, yerbas } = FIXTURE_CONTENT.home.storyProducts
    expect(bombillas).toHaveLength(2)
    expect(yerbas).toHaveLength(3)
    for (const slug of [hero, ...bombillas, ...yerbas]) {
      expect(slugs.has(slug)).toBe(true)
    }
  })

  it('la historia del inicio tiene sus 6 escenas, una por clave', () => {
    const { scenes, ritualSteps } = FIXTURE_CONTENT.home
    expect(scenes.map((scene) => scene.key)).toEqual([
      'pieces',
      'gourd',
      'bombilla',
      'yerba',
      'ritual',
      'leather',
    ])
    expect(ritualSteps).toEqual(['Yerba', 'Montañita', 'Bombilla', 'Agua'])
  })

  it('las preguntas frecuentes mantienen las 6 categorías del diseño', () => {
    expect(FIXTURE_CONTENT.faq.categories.map((category) => category.id)).toEqual([
      'envios',
      'pagos',
      'curado',
      'cuidado',
      'cambios',
      'retiro',
    ])
    expect(FIXTURE_CONTENT.faq.categories.map((category) => category.items.length)).toEqual([
      3, 3, 3, 3, 3, 2,
    ])
  })

  it('la nota "cada pieza es artesanal" es solo de los mates', () => {
    const { mate, bombilla, yerba } = FIXTURE_CONTENT.productTabs
    expect(mate.descriptionNote).toMatch(/^Cada pieza es artesanal/)
    expect(bombilla.descriptionNote).toBeNull()
    expect(yerba.descriptionNote).toBeNull()
    expect(yerba.materialsTitle).toBe('Contenido')
    expect(yerba.careTitle).toBe('Conservación')
  })

  it('los dos documentos legales son de ejemplo', () => {
    const { terms, privacy } = FIXTURE_CONTENT.legal
    expect(terms.title).toBe('Términos y condiciones')
    expect(privacy.title).toBe('Política de privacidad')
    for (const document of [terms, privacy]) {
      expect(document.body).toBe(
        'Texto de ejemplo. Reemplazar por el texto revisado por un profesional antes de publicar.',
      )
    }
  })

  it('los ajustes pasan settingsFormSchema', () => {
    expect(() => settingsFormSchema.parse(FIXTURE_SETTINGS)).not.toThrow()
  })

  it('los ajustes salen del diseño', () => {
    expect(FIXTURE_SETTINGS).toMatchObject({
      kitDiscountPercent: 10,
      installments: { maxWithoutInterest: 3, showOnProduct: true },
      contactEmail: 'galpon.mates@gmail.com',
      priceDisplay: { showNetPrice: true },
      vatRatePercent: 21,
      lowStockThreshold: 3,
    })
    expect(FIXTURE_SETTINGS.shippingOptions.map((option) => option.method)).toEqual([
      'home',
      'branch',
      'pickup',
    ])
    expect(Object.values(FIXTURE_SETTINGS.seller).every((value) => value === null)).toBe(true)
    expect(Object.keys(FIXTURE_SETTINGS.seller)).toHaveLength(8)
  })
})

describe('fixtures del diseño: serialización', () => {
  it('son serializables a JSON sin perder nada', () => {
    const fixtures = {
      categories: FIXTURE_CATEGORIES,
      products: FIXTURE_PRODUCTS,
      reviews: FIXTURE_REVIEWS,
      content: FIXTURE_CONTENT,
      settings: FIXTURE_SETTINGS,
    }
    expect(JSON.parse(JSON.stringify(fixtures))).toEqual(fixtures)
  })
})
