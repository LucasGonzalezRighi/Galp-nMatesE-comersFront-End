import { describe, expect, expectTypeOf, it } from 'vitest'
import type { AdminOrderTarget, MediaPurpose } from '@galpon/domain'
import {
  ADMIN_ORDER_TARGETS,
  MAX_KIT_DISCOUNT_PERCENT,
  MEDIA_PURPOSES,
  PRODUCT_GROUPS,
  SHIPPING_METHODS,
} from '@galpon/domain'
import type {
  CategoryForm,
  MediaSignatureForm,
  OrderStatusChangeForm,
  ProductForm,
  SettingsForm,
  SettingsFormInput,
} from './admin'
import {
  adminLoginSchema,
  adminPasswordChangeSchema,
  adminReviewUpdateSchema,
  categoryFormSchema,
  categoryOrderSchema,
  cuitSchema,
  dispatchSchema,
  imageFormSchema,
  mediaSignatureSchema,
  messageUpdateSchema,
  orderStatusChangeSchema,
  productFormSchema,
  settingsFormSchema,
  slugSchema,
} from './admin'
import { issuesOf, messagesOf } from './test/helpers'

const SLUG = 'Solo minúsculas, números y guiones'
const WEAK = 'Mínimo 10 caracteres, con letras y números'

const validImage = {
  publicId: 'galpon/mate-imperial-1',
  width: 1200,
  height: 1200,
  alt: 'Mate imperial visto de frente',
}

const validProduct = {
  name: 'Mate Imperial',
  slug: 'mate-imperial',
  categoryId: 'cat-mates',
  description: 'Mate de calabaza forrado en cuero, con virola de alpaca.',
  priceArs: 39999,
  stock: 12,
  featured: false,
  status: 'draft',
  images: [validImage],
}

const noSeller = {
  legalName: null,
  cuit: null,
  taxCondition: null,
  address: null,
  phone: null,
  supportArea: null,
  supportHours: null,
  dataFiscalUrl: null,
}

const validSettings = {
  kitDiscountPercent: 10,
  shippingOptions: [
    { method: 'home', costArs: 4500, eta: '3 a 5 días hábiles', enabled: true },
    { method: 'branch', costArs: 3200, eta: '4 a 6 días hábiles', enabled: true },
    { method: 'pickup', costArs: 0, eta: 'Coordinamos el día y la hora', enabled: false },
  ],
  installments: { maxWithoutInterest: 6, showOnProduct: true },
  contactEmail: 'hola@galponmates.com.ar',
  lowStockThreshold: 3,
  vatRatePercent: 21,
  priceDisplay: { showNetPrice: true },
  seller: noSeller,
}

/** Copia de la configuración válida con un campo de primer nivel cambiado. */
function settingsWith(changes: Record<string, unknown>) {
  return { ...validSettings, ...changes }
}

describe('slugSchema', () => {
  it.each(['mate', 'mate-imperial', 'mate-2', '2-mates', 'a'.repeat(80)])('acepta %j', (slug) => {
    expect(slugSchema.parse(slug)).toBe(slug)
  })

  it('recorta los espacios', () => {
    expect(slugSchema.parse(' mate-imperial ')).toBe('mate-imperial')
  })

  it.each(['Mate Imperial', 'mate_imperial', 'mate--imperial', '-mate', 'mate-', 'matéo', 'MATE'])(
    'rechaza %j',
    (slug) => {
      expect(messagesOf(slugSchema, slug)).toEqual([SLUG])
    },
  )

  it.each(['', '   ', undefined])('pide el slug si llega %j', (slug) => {
    expect(messagesOf(slugSchema, slug)).toEqual(['Requerido'])
  })

  it('rechaza más de 80 caracteres', () => {
    expect(messagesOf(slugSchema, 'a'.repeat(81))).toEqual(['Máximo 80 caracteres'])
  })
})

describe('imageFormSchema', () => {
  it('acepta una foto con sus medidas y su texto alternativo', () => {
    expect(imageFormSchema.parse({ ...validImage, alt: ' Mate imperial ' })).toEqual({
      ...validImage,
      alt: 'Mate imperial',
    })
  })

  it.each(['', 'ab', '  ab  ', 'a'.repeat(121), undefined])(
    'pide un texto alternativo de 3 a 120 caracteres si llega %j',
    (alt) => {
      expect(issuesOf(imageFormSchema, { ...validImage, alt })).toEqual([
        { path: ['alt'], message: 'Escribí un texto alternativo de 3 a 120 caracteres' },
      ])
    },
  )

  it('acepta el texto alternativo de 3 y de 120 caracteres', () => {
    expect(imageFormSchema.safeParse({ ...validImage, alt: 'abc' }).success).toBe(true)
    expect(imageFormSchema.safeParse({ ...validImage, alt: 'a'.repeat(120) }).success).toBe(true)
  })

  it.each(['', '   ', undefined])('pide el identificador de Cloudinary si llega %j', (publicId) => {
    expect(issuesOf(imageFormSchema, { ...validImage, publicId })).toEqual([
      { path: ['publicId'], message: 'Requerido' },
    ])
  })

  it('limita el identificador a 255 caracteres', () => {
    expect(imageFormSchema.safeParse({ ...validImage, publicId: 'a'.repeat(255) }).success).toBe(
      true,
    )
    expect(issuesOf(imageFormSchema, { ...validImage, publicId: 'a'.repeat(256) })).toEqual([
      { path: ['publicId'], message: 'Máximo 255 caracteres' },
    ])
  })

  it.each([0, -1, 1.5, '800', undefined])('rechaza el ancho y el alto %j', (side) => {
    expect(issuesOf(imageFormSchema, { ...validImage, width: side, height: side })).toEqual([
      { path: ['width'], message: 'Ingresá un número entero mayor a 0' },
      { path: ['height'], message: 'Ingresá un número entero mayor a 0' },
    ])
  })
})

describe('productFormSchema', () => {
  it('normaliza cada campo', () => {
    expect(
      productFormSchema.parse({
        ...validProduct,
        name: ' Mate Imperial ',
        slug: ' mate-imperial ',
        categoryId: ' cat-mates ',
        description: ' Mate de calabaza forrado en cuero, con virola de alpaca. ',
      }),
    ).toEqual(validProduct)
  })

  it('acepta un producto sin precio ("a consultar"), sin fotos y destacado', () => {
    const parsed = productFormSchema.parse({
      ...validProduct,
      priceArs: null,
      images: [],
      featured: true,
      status: 'published',
    })
    expect(parsed).toMatchObject({ priceArs: null, images: [], featured: true })
  })

  it('rechaza un slug con espacios y mayúsculas', () => {
    expect(issuesOf(productFormSchema, { ...validProduct, slug: 'Mate Imperial' })).toEqual([
      { path: ['slug'], message: SLUG },
    ])
  })

  describe('nombre', () => {
    it('acepta de 3 a 120 caracteres', () => {
      expect(productFormSchema.safeParse({ ...validProduct, name: 'Mat' }).success).toBe(true)
      expect(productFormSchema.safeParse({ ...validProduct, name: 'a'.repeat(120) }).success).toBe(
        true,
      )
    })

    it.each([
      ['', 'Requerido'],
      ['  ', 'Requerido'],
      ['ab', 'Mínimo 3 caracteres'],
      ['a'.repeat(121), 'Máximo 120 caracteres'],
    ])('rechaza %j', (name, message) => {
      expect(issuesOf(productFormSchema, { ...validProduct, name })).toEqual([
        { path: ['name'], message },
      ])
    })
  })

  describe('descripción', () => {
    it.each([
      ['', 'Requerido'],
      ['a'.repeat(9), 'Mínimo 10 caracteres'],
      ['a'.repeat(2001), 'Máximo 2000 caracteres'],
    ])('rechaza %j', (description, message) => {
      expect(issuesOf(productFormSchema, { ...validProduct, description })).toEqual([
        { path: ['description'], message },
      ])
    })

    it('acepta de 10 a 2000 caracteres', () => {
      for (const length of [10, 2000]) {
        const description = 'a'.repeat(length)
        expect(productFormSchema.safeParse({ ...validProduct, description }).success).toBe(true)
      }
    })
  })

  describe('categoría', () => {
    it.each(['', '  ', undefined])('pide la categoría si llega %j', (categoryId) => {
      expect(issuesOf(productFormSchema, { ...validProduct, categoryId })).toEqual([
        { path: ['categoryId'], message: 'Requerido' },
      ])
    })
  })

  describe('precio', () => {
    it.each([1, 39999, 1_000_000, 99_999_999])('acepta %j', (priceArs) => {
      expect(productFormSchema.parse({ ...validProduct, priceArs }).priceArs).toBe(priceArs)
    })

    it('rechaza un precio mayor a $99.999.999, el máximo del contrato', () => {
      expect(issuesOf(productFormSchema, { ...validProduct, priceArs: 100_000_000 })).toEqual([
        { path: ['priceArs'], message: 'El precio no puede superar los $99.999.999' },
      ])
    })

    it('acepta null: el precio queda "a consultar"', () => {
      expect(productFormSchema.parse({ ...validProduct, priceArs: null }).priceArs).toBeNull()
    })

    it.each([0, -1, 10.5, '100', Number.NaN, undefined])('rechaza %j', (priceArs) => {
      expect(issuesOf(productFormSchema, { ...validProduct, priceArs })).toEqual([
        {
          path: ['priceArs'],
          message: 'Ingresá un precio en pesos mayor a 0, o dejalo a consultar',
        },
      ])
    })
  })

  describe('stock', () => {
    it.each([0, 1, 9999])('acepta %j', (stock) => {
      expect(productFormSchema.parse({ ...validProduct, stock }).stock).toBe(stock)
    })

    it.each([-1, 10_000, 1.5, '3', undefined])('rechaza %j', (stock) => {
      expect(issuesOf(productFormSchema, { ...validProduct, stock })).toEqual([
        { path: ['stock'], message: 'Ingresá un número entero entre 0 y 9999' },
      ])
    })
  })

  describe('estado', () => {
    it.each(['draft', 'published'])('acepta %j', (status) => {
      expect(productFormSchema.parse({ ...validProduct, status }).status).toBe(status)
    })

    it.each(['archived', '', undefined])('rechaza %j', (status) => {
      expect(issuesOf(productFormSchema, { ...validProduct, status })).toEqual([
        { path: ['status'], message: 'Elegí un estado' },
      ])
    })
  })

  describe('fotos', () => {
    it('acepta hasta 8 fotos', () => {
      const images = Array.from({ length: 8 }, () => validImage)
      expect(productFormSchema.parse({ ...validProduct, images }).images).toHaveLength(8)
    })

    it('rechaza 9 fotos', () => {
      const images = Array.from({ length: 9 }, () => validImage)
      expect(issuesOf(productFormSchema, { ...validProduct, images })).toEqual([
        { path: ['images'], message: 'Máximo 8 fotos' },
      ])
    })

    it('marca el texto alternativo de la foto que lo tiene mal', () => {
      const images = [validImage, { ...validImage, alt: 'ab' }]
      expect(issuesOf(productFormSchema, { ...validProduct, images })).toEqual([
        {
          path: ['images', 1, 'alt'],
          message: 'Escribí un texto alternativo de 3 a 120 caracteres',
        },
      ])
    })
  })

  describe('texto propio de las pestañas', () => {
    it('es opcional', () => {
      expect(productFormSchema.parse(validProduct)).not.toHaveProperty('tabsOverride')
    })

    it('recorta el texto y deja en undefined el que está vacío', () => {
      const parsed = productFormSchema.parse({
        ...validProduct,
        tabsOverride: { materials: ' Calabaza y alpaca ', care: '   ' },
      })
      expect(parsed.tabsOverride).toEqual({ materials: 'Calabaza y alpaca', care: undefined })
    })

    it('acepta una sola pestaña', () => {
      const parsed = productFormSchema.parse({ ...validProduct, tabsOverride: { care: 'Curalo.' } })
      expect(parsed.tabsOverride).toEqual({ care: 'Curalo.' })
    })

    it.each(['materials', 'care'])('limita %s a 2000 caracteres', (tab) => {
      const tabsOverride = { [tab]: 'a'.repeat(2001) }
      expect(issuesOf(productFormSchema, { ...validProduct, tabsOverride })).toEqual([
        { path: ['tabsOverride', tab], message: 'Máximo 2000 caracteres' },
      ])
    })
  })

  it('tiene los tipos del formulario', () => {
    expectTypeOf<ProductForm['priceArs']>().toEqualTypeOf<number | null>()
    expectTypeOf<ProductForm['status']>().toEqualTypeOf<'draft' | 'published'>()
    expectTypeOf<ProductForm['images'][number]['alt']>().toEqualTypeOf<string>()
  })
})

describe('categoryFormSchema', () => {
  const validCategory = {
    name: 'Mates',
    slug: 'mates',
    group: 'mate',
    blurb: 'Calabaza, madera y cuero.',
    image: validImage,
  }

  it('normaliza cada campo', () => {
    expect(
      categoryFormSchema.parse({
        ...validCategory,
        name: ' Mates ',
        slug: ' mates ',
        blurb: ' Calabaza, madera y cuero. ',
      }),
    ).toEqual(validCategory)
  })

  it('acepta una categoría sin foto (null) y sin descripción', () => {
    expect(categoryFormSchema.parse({ ...validCategory, image: null, blurb: '' })).toMatchObject({
      image: null,
      blurb: '',
    })
  })

  it.each(PRODUCT_GROUPS)('acepta el grupo %j', (group) => {
    expect(categoryFormSchema.parse({ ...validCategory, group }).group).toBe(group)
  })

  it.each(['termos', '', undefined])('rechaza el grupo %j', (group) => {
    expect(issuesOf(categoryFormSchema, { ...validCategory, group })).toEqual([
      { path: ['group'], message: 'Elegí un grupo' },
    ])
  })

  it.each([
    ['', 'Requerido'],
    ['A', 'Mínimo 2 caracteres'],
    ['a'.repeat(61), 'Máximo 60 caracteres'],
  ])('rechaza el nombre %j', (name, message) => {
    expect(issuesOf(categoryFormSchema, { ...validCategory, name })).toEqual([
      { path: ['name'], message },
    ])
  })

  it('rechaza un slug con espacios y mayúsculas', () => {
    expect(issuesOf(categoryFormSchema, { ...validCategory, slug: 'Mate Imperial' })).toEqual([
      { path: ['slug'], message: SLUG },
    ])
  })

  it('acepta una descripción de hasta 200 caracteres y rechaza una más', () => {
    expect(categoryFormSchema.safeParse({ ...validCategory, blurb: 'a'.repeat(200) }).success).toBe(
      true,
    )
    expect(issuesOf(categoryFormSchema, { ...validCategory, blurb: 'a'.repeat(201) })).toEqual([
      { path: ['blurb'], message: 'Máximo 200 caracteres' },
    ])
  })

  it('exige decidir la foto: o hay una foto o es null', () => {
    expect(issuesOf(categoryFormSchema, { ...validCategory, image: undefined })).toMatchObject([
      { path: ['image'] },
    ])
  })

  it('valida la foto de la categoría', () => {
    expect(
      issuesOf(categoryFormSchema, { ...validCategory, image: { ...validImage, alt: 'a' } }),
    ).toEqual([
      { path: ['image', 'alt'], message: 'Escribí un texto alternativo de 3 a 120 caracteres' },
    ])
  })

  it('tiene los tipos del formulario', () => {
    expectTypeOf<CategoryForm['group']>().toEqualTypeOf<(typeof PRODUCT_GROUPS)[number]>()
    expectTypeOf<NonNullable<CategoryForm['image']>['publicId']>().toEqualTypeOf<string>()
    expectTypeOf<null>().toExtend<CategoryForm['image']>()
  })
})

describe('settingsFormSchema', () => {
  it('acepta una configuración completa con el vendedor sin completar', () => {
    expect(settingsFormSchema.parse(validSettings)).toEqual(validSettings)
  })

  describe('descuento del kit', () => {
    it.each([0, 10, MAX_KIT_DISCOUNT_PERCENT])('acepta %j', (kitDiscountPercent) => {
      expect(
        settingsFormSchema.parse(settingsWith({ kitDiscountPercent })).kitDiscountPercent,
      ).toBe(kitDiscountPercent)
    })

    it.each([31, -1, 10.5, '10', undefined])('rechaza %j', (kitDiscountPercent) => {
      expect(issuesOf(settingsFormSchema, settingsWith({ kitDiscountPercent }))).toEqual([
        { path: ['kitDiscountPercent'], message: 'Ingresá un número entero entre 0 y 30' },
      ])
    })
  })

  describe('opciones de envío', () => {
    const shippingError = [
      {
        path: ['shippingOptions'],
        message: 'Cargá los tres métodos de envío, uno de cada tipo',
      },
    ]
    const [home, branch, pickup] = validSettings.shippingOptions

    it('tiene un método de envío del dominio por opción', () => {
      expect(SHIPPING_METHODS).toEqual(['home', 'branch', 'pickup'])
      expect(settingsFormSchema.parse(validSettings).shippingOptions.map((o) => o.method)).toEqual(
        SHIPPING_METHODS,
      )
    })

    it('acepta las tres opciones en cualquier orden', () => {
      const shippingOptions = [pickup, home, branch]
      expect(settingsFormSchema.safeParse(settingsWith({ shippingOptions })).success).toBe(true)
    })

    it.each([
      ['dos opciones', [home, branch]],
      ['ninguna opción', []],
      ['cuatro opciones', [home, branch, pickup, home]],
      ['un método repetido', [home, home, pickup]],
    ])('rechaza %s', (_name, shippingOptions) => {
      expect(issuesOf(settingsFormSchema, settingsWith({ shippingOptions }))).toEqual(shippingError)
    })

    it('rechaza un método que no existe', () => {
      const shippingOptions = [home, branch, { ...pickup, method: 'drone' }]
      const issues = issuesOf(settingsFormSchema, settingsWith({ shippingOptions }))
      expect(issues.map((issue) => issue.path)).toContainEqual(['shippingOptions', 2, 'method'])
    })

    it('acepta un costo de 0 y rechaza uno negativo o con decimales', () => {
      expect(
        settingsFormSchema.safeParse(settingsWith({ shippingOptions: [home, branch, pickup] }))
          .success,
      ).toBe(true)
      for (const costArs of [-1, 10.5, '100', undefined]) {
        const shippingOptions = [{ ...home, costArs }, branch, pickup]
        expect(issuesOf(settingsFormSchema, settingsWith({ shippingOptions }))).toEqual([
          {
            path: ['shippingOptions', 0, 'costArs'],
            message: 'Ingresá un monto en pesos, entero y desde 0',
          },
        ])
      }
    })

    it('acepta un costo de $99.999.999 y rechaza uno mayor, el máximo del contrato', () => {
      const atMax = [{ ...home, costArs: 99_999_999 }, branch, pickup]
      expect(settingsFormSchema.safeParse(settingsWith({ shippingOptions: atMax })).success).toBe(
        true,
      )
      const overMax = [{ ...home, costArs: 100_000_000 }, branch, pickup]
      expect(issuesOf(settingsFormSchema, settingsWith({ shippingOptions: overMax }))).toEqual([
        {
          path: ['shippingOptions', 0, 'costArs'],
          message: 'El monto no puede superar los $99.999.999',
        },
      ])
    })

    it.each([
      ['', 'Requerido'],
      ['a', 'Mínimo 2 caracteres'],
      ['a'.repeat(61), 'Máximo 60 caracteres'],
    ])('rechaza el plazo %j', (eta, message) => {
      const shippingOptions = [home, { ...branch, eta }, pickup]
      expect(issuesOf(settingsFormSchema, settingsWith({ shippingOptions }))).toEqual([
        { path: ['shippingOptions', 1, 'eta'], message },
      ])
    })

    it('acepta un plazo de 2 y de 60 caracteres', () => {
      for (const eta of ['2 d', 'a'.repeat(60)]) {
        const shippingOptions = [home, { ...branch, eta }, pickup]
        expect(settingsFormSchema.safeParse(settingsWith({ shippingOptions })).success).toBe(true)
      }
    })
  })

  describe('cuotas sin interés', () => {
    it.each([1, 6, 12])('acepta %j', (maxWithoutInterest) => {
      const installments = { maxWithoutInterest, showOnProduct: false }
      expect(settingsFormSchema.parse(settingsWith({ installments })).installments).toEqual(
        installments,
      )
    })

    it.each([0, 13, 1.5, '3', undefined])('rechaza %j', (maxWithoutInterest) => {
      const installments = { maxWithoutInterest, showOnProduct: true }
      expect(issuesOf(settingsFormSchema, settingsWith({ installments }))).toEqual([
        {
          path: ['installments', 'maxWithoutInterest'],
          message: 'Ingresá un número entero entre 1 y 12',
        },
      ])
    })
  })

  it('normaliza el email de contacto y rechaza uno inválido', () => {
    expect(
      settingsFormSchema.parse(settingsWith({ contactEmail: ' Hola@Galponmates.com.ar ' }))
        .contactEmail,
    ).toBe('hola@galponmates.com.ar')
    expect(issuesOf(settingsFormSchema, settingsWith({ contactEmail: 'hola@' }))).toEqual([
      { path: ['contactEmail'], message: 'Ingresá un email válido' },
    ])
  })

  describe('umbral de stock bajo', () => {
    it.each([0, 3, 999])('acepta %j', (lowStockThreshold) => {
      expect(settingsFormSchema.parse(settingsWith({ lowStockThreshold })).lowStockThreshold).toBe(
        lowStockThreshold,
      )
    })

    it.each([-1, 1000, 2.5, undefined])('rechaza %j', (lowStockThreshold) => {
      expect(issuesOf(settingsFormSchema, settingsWith({ lowStockThreshold }))).toEqual([
        { path: ['lowStockThreshold'], message: 'Ingresá un número entero entre 0 y 999' },
      ])
    })
  })

  describe('alícuota del IVA', () => {
    it.each([0, 10.5, 21, 100])('acepta %j (admite decimales)', (vatRatePercent) => {
      expect(settingsFormSchema.parse(settingsWith({ vatRatePercent })).vatRatePercent).toBe(
        vatRatePercent,
      )
    })

    it.each([-0.1, 100.1, '21', Number.NaN, Number.POSITIVE_INFINITY, undefined])(
      'rechaza %j',
      (vatRatePercent) => {
        expect(issuesOf(settingsFormSchema, settingsWith({ vatRatePercent }))).toEqual([
          { path: ['vatRatePercent'], message: 'Ingresá un número entre 0 y 100' },
        ])
      },
    )
  })

  it('pide decidir si se muestra el precio sin impuestos', () => {
    expect(issuesOf(settingsFormSchema, settingsWith({ priceDisplay: {} }))).toMatchObject([
      { path: ['priceDisplay', 'showNetPrice'] },
    ])
  })

  describe('datos del vendedor', () => {
    const fullSeller = {
      legalName: 'Galpón Mates S.R.L.',
      cuit: '30-71234567-1',
      taxCondition: 'Responsable Inscripto',
      address: 'Av. Siempre Viva 742, CABA',
      phone: '+54 11 2345-6789',
      supportArea: 'Atención al cliente',
      supportHours: 'Lunes a viernes de 9 a 18 h',
      dataFiscalUrl: 'https://www.afip.gob.ar/f960/qr',
    }
    const sellerWith = (changes: Record<string, unknown>) =>
      settingsWith({ seller: { ...noSeller, ...changes } })

    it('acepta todos los datos en null', () => {
      expect(settingsFormSchema.parse(validSettings).seller).toEqual(noSeller)
    })

    it('acepta todos los datos completos y deja el CUIT en 11 dígitos', () => {
      expect(settingsFormSchema.parse(settingsWith({ seller: fullSeller })).seller).toEqual({
        ...fullSeller,
        cuit: '30712345671',
      })
    })

    it('exige que el vendedor esté, aunque sea con todo en null', () => {
      expect(issuesOf(settingsFormSchema, settingsWith({ seller: undefined }))).toMatchObject([
        { path: ['seller'] },
      ])
    })

    it.each(['legalName', 'taxCondition', 'address', 'phone', 'supportArea', 'supportHours'])(
      'recorta %s y deja en null el que está vacío',
      (field) => {
        expect(settingsFormSchema.parse(sellerWith({ [field]: ' dato ' })).seller).toMatchObject({
          [field]: 'dato',
        })
        for (const empty of ['', '   ']) {
          expect(settingsFormSchema.parse(sellerWith({ [field]: empty })).seller).toMatchObject({
            [field]: null,
          })
        }
      },
    )

    it.each([
      ['legalName', 120],
      ['taxCondition', 60],
      ['address', 200],
      ['phone', 60],
      ['supportArea', 80],
      ['supportHours', 120],
    ])('limita %s a %j caracteres', (field, max) => {
      expect(settingsFormSchema.safeParse(sellerWith({ [field]: 'a'.repeat(max) })).success).toBe(
        true,
      )
      expect(issuesOf(settingsFormSchema, sellerWith({ [field]: 'a'.repeat(max + 1) }))).toEqual([
        { path: ['seller', field], message: `Máximo ${String(max)} caracteres` },
      ])
    })

    it.each([42, undefined])('rechaza un dato que no es texto ni null (%j)', (legalName) => {
      expect(issuesOf(settingsFormSchema, sellerWith({ legalName }))).toEqual([
        { path: ['seller', 'legalName'], message: 'Requerido' },
      ])
    })

    it('valida el CUIT con su dígito verificador', () => {
      expect(settingsFormSchema.parse(sellerWith({ cuit: '20-12345678-6' })).seller.cuit).toBe(
        '20123456786',
      )
      expect(settingsFormSchema.parse(sellerWith({ cuit: '' })).seller.cuit).toBeNull()
      expect(issuesOf(settingsFormSchema, sellerWith({ cuit: '20-12345678-5' }))).toEqual([
        { path: ['seller', 'cuit'], message: 'CUIT inválido' },
      ])
    })

    it('acepta una URL de Data Fiscal con http o https', () => {
      for (const dataFiscalUrl of ['https://www.afip.gob.ar/f960/qr', 'http://ejemplo.com.ar/']) {
        expect(settingsFormSchema.parse(sellerWith({ dataFiscalUrl })).seller.dataFiscalUrl).toBe(
          dataFiscalUrl,
        )
      }
      expect(
        settingsFormSchema.parse(sellerWith({ dataFiscalUrl: ' ' })).seller.dataFiscalUrl,
      ).toBeNull()
    })

    it.each(['no es una url', 'www.afip.gob.ar', 'javascript:alert(1)', 'ftp://ejemplo.com'])(
      'rechaza la URL %j',
      (dataFiscalUrl) => {
        expect(issuesOf(settingsFormSchema, sellerWith({ dataFiscalUrl }))).toEqual([
          {
            path: ['seller', 'dataFiscalUrl'],
            message: 'Ingresá una URL válida, con http:// o https://',
          },
        ])
      },
    )

    it('limita la URL a 2048 caracteres', () => {
      const long = `https://ejemplo.com/${'a'.repeat(2048)}`
      expect(issuesOf(settingsFormSchema, sellerWith({ dataFiscalUrl: long }))).toEqual([
        { path: ['seller', 'dataFiscalUrl'], message: 'Máximo 2048 caracteres' },
      ])
    })
  })

  it('tiene los tipos del formulario', () => {
    expectTypeOf<SettingsForm['seller']['cuit']>().toEqualTypeOf<string | null>()
    expectTypeOf<SettingsFormInput['seller']['dataFiscalUrl']>().toEqualTypeOf<string | null>()
    expectTypeOf<SettingsForm['shippingOptions'][number]['method']>().toEqualTypeOf<
      (typeof SHIPPING_METHODS)[number]
    >()
  })
})

describe('dispatchSchema', () => {
  const validDispatch = { carrier: 'Correo Argentino', trackingNumber: 'CA123456789AR' }

  it('recorta y devuelve cada campo', () => {
    expect(
      dispatchSchema.parse({ carrier: ' Correo Argentino ', trackingNumber: ' CA123456789AR ' }),
    ).toEqual(validDispatch)
  })

  it.each([
    ['', 'Requerido'],
    ['A', 'Mínimo 2 caracteres'],
    ['a'.repeat(41), 'Máximo 40 caracteres'],
  ])('rechaza la empresa %j', (carrier, message) => {
    expect(issuesOf(dispatchSchema, { ...validDispatch, carrier })).toEqual([
      { path: ['carrier'], message },
    ])
  })

  it.each([
    ['', 'Requerido'],
    ['ABC', 'Mínimo 4 caracteres'],
    ['a'.repeat(41), 'Máximo 40 caracteres'],
  ])('rechaza el número de seguimiento %j', (trackingNumber, message) => {
    expect(issuesOf(dispatchSchema, { ...validDispatch, trackingNumber })).toEqual([
      { path: ['trackingNumber'], message },
    ])
  })

  it('acepta los límites de empresa (2 y 40) y de seguimiento (4 y 40)', () => {
    for (const [carrier, trackingNumber] of [
      ['AB', 'ABCD'],
      ['a'.repeat(40), 'a'.repeat(40)],
    ] as const) {
      expect(dispatchSchema.safeParse({ carrier, trackingNumber }).success).toBe(true)
    }
  })
})

describe('adminLoginSchema', () => {
  it('normaliza el email y deja la contraseña como está', () => {
    expect(adminLoginSchema.parse({ email: ' Admin@Galpon.com ', password: 'x' })).toEqual({
      email: 'admin@galpon.com',
      password: 'x',
    })
  })

  it('pide los dos campos', () => {
    expect(issuesOf(adminLoginSchema, { email: '', password: '' })).toEqual([
      { path: ['email'], message: 'Ingresá un email válido' },
      { path: ['password'], message: 'Requerido' },
    ])
  })
})

describe('adminPasswordChangeSchema', () => {
  const validChange = {
    currentPassword: 'la-actual',
    newPassword: 'abcdefghi1',
    confirmation: 'abcdefghi1',
  }

  it('acepta una confirmación igual a la contraseña nueva', () => {
    expect(adminPasswordChangeSchema.parse(validChange)).toEqual(validChange)
  })

  it('marca la confirmación distinta en confirmation', () => {
    expect(
      issuesOf(adminPasswordChangeSchema, { ...validChange, confirmation: 'abcdefghi2' }),
    ).toEqual([{ path: ['confirmation'], message: 'Las contraseñas no coinciden' }])
  })

  it('exige que la contraseña nueva cumpla la regla', () => {
    const weak = { ...validChange, newPassword: 'abcdefghij', confirmation: 'abcdefghij' }
    expect(issuesOf(adminPasswordChangeSchema, weak)).toEqual([
      { path: ['newPassword'], message: WEAK },
    ])
  })

  it('pide la contraseña actual', () => {
    expect(issuesOf(adminPasswordChangeSchema, { ...validChange, currentPassword: '' })).toEqual([
      { path: ['currentPassword'], message: 'Requerido' },
    ])
  })
})

describe('cuitSchema', () => {
  it.each([
    ['20-12345678-6', '20123456786'],
    ['20123456786', '20123456786'],
    [' 20-12345678-6 ', '20123456786'],
    ['30-71234567-1', '30712345671'],
    ['27-12345678-0', '27123456780'],
  ])('acepta %j como %j', (input, expected) => {
    expect(cuitSchema.parse(input)).toBe(expected)
  })

  it('rechaza un dígito verificador incorrecto', () => {
    expect(messagesOf(cuitSchema, '20-12345678-5')).toEqual(['CUIT inválido'])
  })

  it.each(['20-00000001-0', '20-00000001-1', '20-00000001-9'])(
    'rechaza %j: la cuenta da 10 y no hay dígito que lo cumpla',
    (input) => {
      expect(messagesOf(cuitSchema, input)).toEqual(['CUIT inválido'])
    },
  )

  it.each([
    '',
    'abc',
    '2012345678',
    '201234567860',
    '20-1234567-86',
    '2-012345678-6',
    '20.12345678.6',
    '20 12345678 6',
    '20-12345678-',
    '--20123456786',
  ])('rechaza el formato %j', (input) => {
    expect(messagesOf(cuitSchema, input)).toEqual(['CUIT inválido'])
  })

  it.each([undefined, null, 20123456786])('rechaza lo que no es texto (%j)', (input) => {
    expect(messagesOf(cuitSchema, input)).toEqual(['CUIT inválido'])
  })
})

describe('categoryOrderSchema', () => {
  it('acepta las líneas en el orden nuevo y recorta cada identificador', () => {
    expect(categoryOrderSchema.parse({ ids: [' cat-torpedos ', 'cat-imperiales'] })).toEqual({
      ids: ['cat-torpedos', 'cat-imperiales'],
    })
  })

  it('una lista vacía da "Requerido"', () => {
    expect(issuesOf(categoryOrderSchema, { ids: [] })).toEqual([
      { path: ['ids'], message: 'Requerido' },
    ])
  })

  it('una línea repetida da el error en la lista', () => {
    expect(
      issuesOf(categoryOrderSchema, { ids: ['cat-imperiales', 'cat-torpedos', ' cat-imperiales'] }),
    ).toEqual([{ path: ['ids'], message: 'Cada línea tiene que aparecer una sola vez' }])
  })

  it.each([
    ['', 'Requerido'],
    ['a'.repeat(81), 'Máximo 80 caracteres'],
  ])('rechaza el identificador %j', (id, message) => {
    expect(issuesOf(categoryOrderSchema, { ids: ['cat-imperiales', id] })).toEqual([
      { path: ['ids', 1], message },
    ])
  })
})

describe('mediaSignatureSchema', () => {
  it.each(MEDIA_PURPOSES)('acepta el uso %s', (purpose) => {
    expect(mediaSignatureSchema.parse({ purpose })).toEqual({ purpose })
  })

  it('rechaza un uso desconocido', () => {
    expect(issuesOf(mediaSignatureSchema, { purpose: 'avatar' })).toEqual([
      { path: ['purpose'], message: 'Elegí para qué es la foto' },
    ])
  })

  it('el uso es el del dominio', () => {
    expectTypeOf<MediaSignatureForm['purpose']>().toEqualTypeOf<MediaPurpose>()
  })
})

describe('orderStatusChangeSchema', () => {
  const shipped = {
    status: 'shipped',
    carrier: 'Andreani',
    trackingNumber: 'AND123456789',
    note: null,
  }

  it('al despachar recorta la empresa, el seguimiento y la nota', () => {
    expect(
      orderStatusChangeSchema.parse({
        status: 'shipped',
        carrier: ' Andreani ',
        trackingNumber: ' AND123456789 ',
        note: ' Sale mañana a primera hora ',
      }),
    ).toEqual({ ...shipped, note: 'Sale mañana a primera hora' })
  })

  it.each(['preparing', 'delivered', 'cancelled'])(
    'con %s la empresa y el seguimiento van en null',
    (status) => {
      expect(
        orderStatusChangeSchema.parse({ status, carrier: null, trackingNumber: null, note: null }),
      ).toEqual({ status, carrier: null, trackingNumber: null, note: null })
    },
  )

  it('sin empresa, seguimiento ni nota los completa con null', () => {
    expect(orderStatusChangeSchema.parse({ status: 'preparing' })).toEqual({
      status: 'preparing',
      carrier: null,
      trackingNumber: null,
      note: null,
    })
  })

  it.each(['', '   '])('una nota %j queda en null', (note) => {
    expect(orderStatusChangeSchema.parse({ ...shipped, note }).note).toBeNull()
  })

  it('la nota admite hasta 500 caracteres', () => {
    expect(orderStatusChangeSchema.parse({ ...shipped, note: 'a'.repeat(500) }).note).toHaveLength(
      500,
    )
    expect(issuesOf(orderStatusChangeSchema, { ...shipped, note: 'a'.repeat(501) })).toEqual([
      { path: ['note'], message: 'Máximo 500 caracteres' },
    ])
  })

  it.each([
    [null, 'Requerido'],
    ['', 'Requerido'],
    ['A', 'Mínimo 2 caracteres'],
    ['a'.repeat(41), 'Máximo 40 caracteres'],
  ])('al despachar rechaza la empresa %j con el mensaje del despacho', (carrier, message) => {
    expect(issuesOf(orderStatusChangeSchema, { ...shipped, carrier })).toEqual([
      { path: ['carrier'], message },
    ])
  })

  it.each([
    [null, 'Requerido'],
    ['', 'Requerido'],
    ['ABC', 'Mínimo 4 caracteres'],
    ['a'.repeat(41), 'Máximo 40 caracteres'],
  ])(
    'al despachar rechaza el seguimiento %j con el mensaje del despacho',
    (trackingNumber, message) => {
      expect(issuesOf(orderStatusChangeSchema, { ...shipped, trackingNumber })).toEqual([
        { path: ['trackingNumber'], message },
      ])
    },
  )

  it('con los demás destinos no admite empresa ni seguimiento', () => {
    expect(
      issuesOf(orderStatusChangeSchema, {
        status: 'cancelled',
        carrier: 'Andreani',
        trackingNumber: 'AND123456789',
        note: null,
      }),
    ).toEqual([
      { path: ['carrier'], message: 'Solo se completa al despachar el pedido' },
      { path: ['trackingNumber'], message: 'Solo se completa al despachar el pedido' },
    ])
  })

  it.each(['paid', 'pending_payment', 'refunded'])('rechaza el destino %s', (status) => {
    expect(issuesOf(orderStatusChangeSchema, { ...shipped, status })).toEqual([
      { path: ['status'], message: 'Elegí el estado nuevo del pedido' },
    ])
  })

  it('los destinos son los del dominio', () => {
    expectTypeOf<OrderStatusChangeForm['status']>().toEqualTypeOf<AdminOrderTarget>()
    for (const status of ADMIN_ORDER_TARGETS) {
      const change = status === 'shipped' ? shipped : { status }
      expect(orderStatusChangeSchema.safeParse({ ...change, status }).success).toBe(true)
    }
  })
})

describe('adminReviewUpdateSchema', () => {
  it.each([
    { status: 'approved' },
    { status: 'hidden' },
    { featured: true },
    { status: 'pending', featured: false },
  ])('acepta %j', (update) => {
    expect(adminReviewUpdateSchema.parse(update)).toEqual(update)
  })

  it('sin ningún cambio da "Mandá al menos un cambio"', () => {
    expect(issuesOf(adminReviewUpdateSchema, {})).toEqual([
      { path: [], message: 'Mandá al menos un cambio' },
    ])
  })

  it('descarta los campos que no se moderan', () => {
    expect(issuesOf(adminReviewUpdateSchema, { text: 'Otro texto' })).toEqual([
      { path: [], message: 'Mandá al menos un cambio' },
    ])
    expect(adminReviewUpdateSchema.parse({ featured: true, text: 'Otro texto' })).toEqual({
      featured: true,
    })
  })

  it('rechaza un estado desconocido', () => {
    expect(issuesOf(adminReviewUpdateSchema, { status: 'deleted' })).toEqual([
      { path: ['status'], message: 'Elegí un estado' },
    ])
  })

  it('rechaza un destacado que no es sí o no', () => {
    expect(
      issuesOf(adminReviewUpdateSchema, { featured: 'sí' }).map((issue) => issue.path),
    ).toEqual([['featured']])
  })
})

describe('messageUpdateSchema', () => {
  it.each([true, false])('acepta read %s', (read) => {
    expect(messageUpdateSchema.parse({ read })).toEqual({ read })
  })

  it('rechaza un cambio sin read', () => {
    expect(issuesOf(messageUpdateSchema, {}).map((issue) => issue.path)).toEqual([['read']])
  })
})
