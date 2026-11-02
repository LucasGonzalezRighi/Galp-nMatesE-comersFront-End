import { describe, expect, it } from 'vitest'
import { kitProductsFrom } from './kit-products'
import { buildKitView, kitOptions, linkedMate, resolvePieces } from './kit-view'
import { missingText, noOptionsText, stepHint } from './kit.copy'
import { CATALOG, kitProduct } from './test/support'

describe('kitOptions', () => {
  it('ofrece solo los comprables del grupo, en el orden del catálogo', () => {
    expect(kitOptions(CATALOG, 'mate').map((product) => product.id)).toEqual(['m1', 'm2'])
    expect(kitOptions(CATALOG, 'bombilla').map((product) => product.id)).toEqual(['b1', 'b2'])
  })

  it('un producto sin precio no es una opción aunque diga que se puede comprar', () => {
    const sinPrecio = kitProduct({ id: 'x', priceArs: null })

    expect(kitOptions([sinPrecio], 'mate')).toEqual([])
  })
})

describe('kitProductsFrom', () => {
  it('descarta lo que no se puede comprar y reduce el producto a lo que usa el kit', () => {
    const result = kitProductsFrom([
      {
        categoryId: 'c',
        categoryName: 'Imperiales',
        categorySlug: 'imperiales',
        code: 'N°01',
        description: 'Descripción',
        featured: true,
        group: 'mate',
        id: 'm1',
        isPurchasable: true,
        isSoldOut: false,
        mainImage: { alt: 'Foto', height: 10, publicId: 'p', url: '/foto.jpg', width: 10 },
        maxQuantity: 5,
        name: 'Mate',
        netPriceArs: 100,
        priceArs: 121,
        rating: { average: 4, count: 1 },
        slug: 'mate',
      },
      {
        categoryId: 'c',
        categoryName: 'Imperiales',
        categorySlug: 'imperiales',
        code: 'N°02',
        description: 'Descripción',
        featured: false,
        group: 'mate',
        id: 'm2',
        isPurchasable: false,
        isSoldOut: true,
        mainImage: null,
        maxQuantity: 0,
        name: 'Mate agotado',
        netPriceArs: 100,
        priceArs: 121,
        rating: { average: 0, count: 0 },
        slug: 'mate-agotado',
      },
    ])

    expect(result).toEqual([
      {
        id: 'm1',
        slug: 'mate',
        name: 'Mate',
        group: 'mate',
        categoryName: 'Imperiales',
        priceArs: 121,
        maxQuantity: 5,
        isPurchasable: true,
        image: { url: '/foto.jpg', alt: 'Foto' },
      },
    ])
  })
})

describe('linkedMate (/kit?mate=)', () => {
  it('elige un mate comprable por su slug', () => {
    expect(linkedMate('mate-dos', CATALOG)?.id).toBe('m2')
  })

  it.each([
    ['no viene el parámetro', null],
    ['viene vacío', ''],
    ['no existe', 'mate-que-no-existe'],
    ['es una bombilla', 'bombillon-curvo'],
    ['es un mate sin stock', 'mate-agotado'],
    ['tiene mayúsculas', 'MATE-UNO'],
    ['tiene puntos', '../mate-uno'],
    ['tiene un porcentaje', '%'],
    ['es un script', '<script>alert(1)</script>'],
  ])('se ignora si %s', (_caso, slug) => {
    expect(linkedMate(slug, CATALOG)).toBeNull()
  })
})

describe('resolvePieces', () => {
  it('busca las piezas por id y deja en null las que faltan', () => {
    const pieces = resolvePieces(CATALOG, { mate: 'm1', yerba: 'y2' })

    expect(pieces.mate?.name).toBe('Mate Imperial Premium')
    expect(pieces.bombilla).toBeNull()
    expect(pieces.yerba?.name).toBe('Yerba Té y Jengibre')
  })

  it('una pieza que dejó de ser comprable, o de otro grupo, cuenta como no elegida', () => {
    const pieces = resolvePieces(CATALOG, { mate: 'm3', bombilla: 'y1', yerba: 'no-existe' })

    expect(pieces).toEqual({ mate: null, bombilla: null, yerba: null })
  })
})

describe('buildKitView', () => {
  const base = { products: CATALOG, discountPercent: 10 }

  it('sin nada elegido: los pasos dicen "Sin elegir" y "Faltan 3", y los importes son 0', () => {
    const view = buildKitView({ ...base, step: 0, picks: {} })

    expect(view.steps.map((step) => step.detail)).toEqual([
      'Sin elegir',
      'Sin elegir',
      'Sin elegir',
      'Faltan 3',
    ])
    expect(view.steps.map((step) => step.mark)).toEqual(['01', '02', '03', '04'])
    expect(view.steps.map((step) => step.status)).toEqual(['current', 'idle', 'idle', 'idle'])
    expect(view.isComplete).toBe(false)
    expect(view.missing).toEqual(['mate', 'bombilla', 'yerba'])
    expect(view.amounts).toEqual({ grossArs: 0, savingsArs: 0, totalArs: 0 })
    expect(view.group).toBe('mate')
    expect(view.progress).toBe(0)
  })

  it('un paso resuelto muestra el tilde y el nombre de la pieza, salvo que sea el actual', () => {
    const view = buildKitView({ ...base, step: 1, picks: { mate: 'm1' } })

    expect(view.steps[0]).toMatchObject({
      mark: '✓',
      detail: 'Mate Imperial Premium',
      status: 'done',
    })
    expect(view.steps[1]).toMatchObject({ mark: '02', status: 'current' })
    expect(view.steps[3]?.detail).toBe('Faltan 2')

    const onMate = buildKitView({ ...base, step: 0, picks: { mate: 'm1' } })
    expect(onMate.steps[0]).toMatchObject({ mark: '01', status: 'current' })
  })

  it('con las tres piezas: "Listo para agregar", Resumen sin opciones y importes de kitLineAmounts', () => {
    const view = buildKitView({
      ...base,
      step: 3,
      picks: { mate: 'm1', bombilla: 'b1', yerba: 'y1' },
    })

    expect(view.isComplete).toBe(true)
    expect(view.steps[3]).toMatchObject({ detail: 'Listo para agregar', status: 'current' })
    expect(view.group).toBeNull()
    expect(view.options).toEqual([])
    expect(view.progress).toBe(1)
    // 39.999 + 25.999 + 9.999 = 75.997; 10 % redondeado = 7.600.
    expect(view.amounts).toEqual({ grossArs: 75997, savingsArs: 7600, totalArs: 68397 })
  })

  it('con piezas a medias calcula el panel con lo elegido', () => {
    const view = buildKitView({ ...base, step: 1, picks: { mate: 'm1' } })

    expect(view.amounts).toEqual({ grossArs: 39999, savingsArs: 4000, totalArs: 35999 })
    expect(view.options.map((product) => product.id)).toEqual(['b1', 'b2'])
    expect(view.slots.map((slot) => slot.product?.id ?? null)).toEqual(['m1', null, null])
  })

  it('respeta el descuento que cargó el negocio, incluido el 0', () => {
    const picks = { mate: 'm1', bombilla: 'b1', yerba: 'y1' }

    expect(buildKitView({ ...base, step: 3, picks, discountPercent: 30 }).amounts).toEqual({
      grossArs: 75997,
      savingsArs: 22799,
      totalArs: 53198,
    })
    expect(buildKitView({ ...base, step: 3, picks, discountPercent: 0 }).amounts.savingsArs).toBe(0)
  })

  it('un descuento fuera de rango es un error', () => {
    expect(() => buildKitView({ ...base, step: 0, picks: {}, discountPercent: 31 })).toThrow(
      RangeError,
    )
  })
})

describe('textos del kit', () => {
  it('lista lo que falta con su artículo', () => {
    expect(missingText(['mate', 'bombilla', 'yerba'])).toBe(
      'Te falta elegir el mate, la bombilla, la yerba.',
    )
    expect(missingText(['yerba'])).toBe('Te falta elegir la yerba.')
    expect(() => missingText([])).toThrow(RangeError)
  })

  it('la ayuda del mate usa la cantidad de mates comprables', () => {
    expect(stepHint('mate', 16)).toBe(
      '16 mates entre imperiales, torpedos, camioneros y rancheros.',
    )
    expect(stepHint('mate', 1)).toBe('1 mate entre imperiales, torpedos, camioneros y rancheros.')
    expect(stepHint('bombilla', 2)).toBe('Bombillones de alpaca con picos de bronce.')
    expect(stepHint('yerba', 3)).toBe('Yerba Canarias en sus tres versiones.')
  })

  it('avisa cuando un grupo no tiene opciones', () => {
    expect(noOptionsText('yerba')).toBe('No hay yerbas disponibles por ahora')
    expect(noOptionsText('bombilla')).toBe('No hay bombillas disponibles por ahora')
    expect(noOptionsText('mate')).toBe('No hay mates disponibles por ahora')
  })
})
