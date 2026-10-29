import { describe, expect, it } from 'vitest'
import type { AdminProduct } from '@galpon/api-client'
import { getAdminProduct } from '@galpon/api-client'
import { createTestApp } from '../../test/render'
import {
  isProductFormPath,
  newProductFormValues,
  photoAltPath,
  productFormValuesSchema,
  republishInput,
  toAdminProductInput,
  toProductFormValues,
} from './product-form-values'

/** El Mate Imperial Premium de la base simulada, con sus dos fotos. */
async function imperialPremium(): Promise<AdminProduct> {
  const app = await createTestApp({ demo: false })
  return getAdminProduct(app.api, 'prd-imperial-premium')
}

describe('toProductFormValues', () => {
  it('pasa el producto al formulario, con la url de cada foto para la vista previa', async () => {
    const product = await imperialPremium()
    expect(toProductFormValues(product)).toEqual({
      name: 'Mate Imperial Premium',
      slug: 'mate-imperial-premium',
      categoryId: 'cat-imperiales',
      description: 'Imperial con virola y base de alpaca con pelotitas en bronce.',
      priceArs: 39999,
      priceOnRequest: false,
      stock: 12,
      featured: true,
      status: 'published',
      images: [
        {
          publicId: 'galpon/productos/mate-imperial-premium',
          url: '/mock-images/mate-imperial-premium.jpg',
          width: 960,
          height: 1280,
          alt: 'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce',
        },
        {
          publicId: 'galpon/productos/mate-imperial-premium-2',
          url: '/mock-images/mate-imperial-premium-2.jpg',
          width: 352,
          height: 462,
          alt: 'Mate Imperial Premium con virola cincelada, base con pelotitas de bronce y una bombilla de pico de bronce al costado',
        },
      ],
      tabsOverride: { materials: '', care: '' },
    })
  })

  it('sin precio marca "a consultar"; archivado queda en borrador; trae los textos propios', async () => {
    const product: AdminProduct = {
      ...(await imperialPremium()),
      priceArs: null,
      status: 'archived',
      tabsOverride: { materials: 'Calabaza curada.', care: null },
    }
    expect(toProductFormValues(product)).toMatchObject({
      priceArs: null,
      priceOnRequest: true,
      status: 'draft',
      tabsOverride: { materials: 'Calabaza curada.', care: '' },
    })
  })
})

describe('newProductFormValues', () => {
  it('arranca vacío, en borrador y sin fotos', () => {
    expect(newProductFormValues()).toEqual({
      name: '',
      slug: '',
      categoryId: '',
      description: '',
      priceArs: null,
      priceOnRequest: false,
      stock: null,
      featured: false,
      status: 'draft',
      images: [],
      tabsOverride: { materials: '', care: '' },
    })
  })
})

describe('productFormValuesSchema', () => {
  it('pide un precio salvo que sea a consultar, aunque otros campos tengan errores', () => {
    const result = productFormValuesSchema.safeParse(newProductFormValues())
    expect(result.success).toBe(false)
    const paths = result.error?.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('priceArs')
    expect(paths).toContain('stock')
    expect(paths).toContain('name')
    expect(result.error?.issues.find((issue) => issue.path[0] === 'priceArs')?.message).toBe(
      'Ingresá un precio en pesos mayor a 0, o dejalo a consultar',
    )
    expect(result.error?.issues.find((issue) => issue.path[0] === 'stock')?.message).toBe(
      'Ingresá un número entero entre 0 y 9999',
    )

    const onRequest = productFormValuesSchema.safeParse({
      ...newProductFormValues(),
      priceOnRequest: true,
    })
    expect(onRequest.error?.issues.map((issue) => issue.path.join('.'))).not.toContain('priceArs')
  })
})

describe('toAdminProductInput', () => {
  it('ida y vuelta: el producto guardado vuelve igual, con las fotos sin url', async () => {
    const product = await imperialPremium()
    const input = toAdminProductInput(productFormValuesSchema.parse(toProductFormValues(product)))
    expect(input).toEqual({
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      description: product.description,
      priceArs: 39999,
      stock: 12,
      featured: true,
      status: 'published',
      images: [
        {
          publicId: 'galpon/productos/mate-imperial-premium',
          width: 960,
          height: 1280,
          alt: 'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce',
        },
        {
          publicId: 'galpon/productos/mate-imperial-premium-2',
          width: 352,
          height: 462,
          alt: 'Mate Imperial Premium con virola cincelada, base con pelotitas de bronce y una bombilla de pico de bronce al costado',
        },
      ],
      tabsOverride: null,
    })
    expect(input.images[0]).not.toHaveProperty('url')
  })

  it('"a consultar" manda el precio en null y un solo texto propio deja el otro en null', async () => {
    const values = {
      ...toProductFormValues(await imperialPremium()),
      priceArs: 39999,
      priceOnRequest: true,
      tabsOverride: { materials: '  ', care: ' Secalo boca abajo. ' },
    }
    expect(toAdminProductInput(productFormValuesSchema.parse(values))).toMatchObject({
      priceArs: null,
      tabsOverride: { materials: null, care: 'Secalo boca abajo.' },
    })
  })
})

describe('republishInput', () => {
  it('manda lo guardado con estado publicado y la fecha con la que se abrió', async () => {
    const product: AdminProduct = {
      ...(await imperialPremium()),
      status: 'archived',
      tabsOverride: { materials: 'Propio.', care: null },
    }
    expect(republishInput(product, '2026-10-01T10:00:00Z')).toEqual({
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      description: product.description,
      priceArs: 39999,
      stock: 12,
      featured: true,
      status: 'published',
      images: [
        {
          publicId: 'galpon/productos/mate-imperial-premium',
          width: 960,
          height: 1280,
          alt: 'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce',
        },
        {
          publicId: 'galpon/productos/mate-imperial-premium-2',
          width: 352,
          height: 462,
          alt: 'Mate Imperial Premium con virola cincelada, base con pelotitas de bronce y una bombilla de pico de bronce al costado',
        },
      ],
      tabsOverride: { materials: 'Propio.', care: null },
      expectedUpdatedAt: '2026-10-01T10:00:00Z',
    })
  })

  it('rechaza una fecha vacía', async () => {
    const product = await imperialPremium()
    expect(() => republishInput(product, ' ')).toThrow(RangeError)
  })
})

describe('isProductFormPath', () => {
  it('reconoce los campos del formulario, también los de cada foto', () => {
    expect(isProductFormPath('slug')).toBe(true)
    expect(isProductFormPath('images.2.alt')).toBe(true)
    expect(isProductFormPath('images.0.publicId')).toBe(true)
    expect(isProductFormPath('tabsOverride.care')).toBe(true)
    expect(isProductFormPath('images')).toBe(true)
    expect(isProductFormPath('expectedUpdatedAt')).toBe(false)
    expect(isProductFormPath('images.x.alt')).toBe(false)
  })
})

describe('photoAltPath', () => {
  it('arma la ruta del texto alternativo de cada foto', () => {
    expect(photoAltPath(2)).toBe('images.2.alt')
    expect(() => photoAltPath(-1)).toThrow(RangeError)
  })
})
