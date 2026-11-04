import { describe, expect, it } from 'vitest'
import type { Combo } from '@galpon/api-client'
import { LEATHERS } from '@galpon/domain'
import type { PieceProduct } from './combo-form-values'
import {
  comboDialogSchema,
  comboFormValues,
  comboPieces,
  comboSummary,
  selectedByGroup,
  withPiece,
} from './combo-form-values'

/** Un producto publicado del dashboard, con lo que el formulario usa. */
function product(
  id: string,
  name: string,
  group: PieceProduct['group'],
  priceArs: number | null,
  isSoldOut = false,
): PieceProduct {
  return { id, name, group, priceArs, isSoldOut }
}

/** Productos publicados: un mate, una bombilla, una yerba agotada y un mate "a consultar". */
const PRODUCTS = [
  product('prd-imperial-premium', 'Mate Imperial Premium', 'mate', 39999),
  product('prd-bombillon-premium-curvo', 'Bombillón Premium Curvo', 'bombilla', 28999),
  product('prd-yerba-canarias', 'Yerba Canarias 1 kg', 'yerba', 9999, true),
  product('prd-torpedo-acero', 'Mate Torpedo Línea Acero', 'mate', null),
]

/** Un combo guardado con una pieza (el Mate Galleta) que ya no está publicada. */
const SAVED: Combo = {
  id: 'cmb-galleta-y-canarias',
  name: 'Galleta y Canarias',
  description: 'El galleta de siempre con un kilo de Canarias.',
  items: [
    {
      productId: 'prd-galleta',
      slug: 'mate-galleta',
      name: 'Mate Galleta',
      group: 'mate',
      leathers: [...LEATHERS],
      unitPriceArs: 27999,
      isPurchasable: false,
      maxQuantity: 0,
      image: null,
    },
    {
      productId: 'prd-yerba-canarias',
      slug: 'yerba-canarias',
      name: 'Yerba Canarias 1 kg',
      group: 'yerba',
      leathers: [],
      unitPriceArs: 9999,
      isPurchasable: true,
      maxQuantity: 30,
      image: null,
    },
  ],
  priceArs: 33999,
  netPriceArs: null,
  listPriceArs: 37998,
  savingsArs: 3999,
  isPurchasable: false,
  isSoldOut: true,
  maxQuantity: 0,
  status: 'draft',
  position: 5,
}

describe('comboFormValues', () => {
  it('arranca un combo nuevo vacío, sin precio y en borrador', () => {
    expect(comboFormValues(null)).toEqual({
      name: '',
      description: '',
      productIds: [],
      priceArs: null,
      status: 'draft',
    })
  })

  it('toma los datos del combo que se edita, con sus piezas en orden', () => {
    expect(comboFormValues(SAVED)).toEqual({
      name: 'Galleta y Canarias',
      description: 'El galleta de siempre con un kilo de Canarias.',
      productIds: ['prd-galleta', 'prd-yerba-canarias'],
      priceArs: 33999,
      status: 'draft',
    })
  })
})

describe('comboDialogSchema', () => {
  it('pide el precio con el mensaje de comboFormSchema y deja el combo listo para la API', () => {
    const empty = comboDialogSchema.safeParse({ ...comboFormValues(SAVED), priceArs: null })
    expect(empty.success).toBe(false)
    expect(empty.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['priceArs', 'Ingresá un precio en pesos mayor a 0'],
    ])
    expect(comboDialogSchema.parse({ ...comboFormValues(SAVED), name: '  Galleta  ' })).toEqual({
      name: 'Galleta',
      description: 'El galleta de siempre con un kilo de Canarias.',
      productIds: ['prd-galleta', 'prd-yerba-canarias'],
      priceArs: 33999,
      status: 'draft',
    })
  })

  it('no acepta una sola pieza', () => {
    const result = comboDialogSchema.safeParse({
      ...comboFormValues(SAVED),
      productIds: ['prd-yerba-canarias'],
    })
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['Cargá de 2 a 3 productos'])
  })
})

describe('comboPieces', () => {
  it('ofrece los publicados con precio y suma las piezas guardadas que ya no se venden', () => {
    expect(comboPieces(PRODUCTS, SAVED)).toEqual([
      {
        id: 'prd-imperial-premium',
        name: 'Mate Imperial Premium',
        group: 'mate',
        priceArs: 39999,
        isAvailable: true,
        isSoldOut: false,
      },
      {
        id: 'prd-bombillon-premium-curvo',
        name: 'Bombillón Premium Curvo',
        group: 'bombilla',
        priceArs: 28999,
        isAvailable: true,
        isSoldOut: false,
      },
      {
        id: 'prd-yerba-canarias',
        name: 'Yerba Canarias 1 kg',
        group: 'yerba',
        priceArs: 9999,
        isAvailable: true,
        isSoldOut: true,
      },
      {
        id: 'prd-galleta',
        name: 'Mate Galleta',
        group: 'mate',
        priceArs: 27999,
        isAvailable: false,
        isSoldOut: true,
      },
    ])
  })

  it('sin combo, ofrece solo los publicados con precio', () => {
    expect(comboPieces(PRODUCTS, null).map((piece) => piece.id)).toEqual([
      'prd-imperial-premium',
      'prd-bombillon-premium-curvo',
      'prd-yerba-canarias',
    ])
  })
})

describe('selectedByGroup y withPiece', () => {
  const pieces = comboPieces(PRODUCTS, SAVED)

  it('reparte las piezas elegidas por grupo', () => {
    expect(selectedByGroup(['prd-galleta', 'prd-yerba-canarias'], pieces)).toEqual({
      mate: 'prd-galleta',
      bombilla: '',
      yerba: 'prd-yerba-canarias',
    })
    expect(selectedByGroup(['prd-no-existe'], pieces)).toEqual({
      mate: '',
      bombilla: '',
      yerba: '',
    })
  })

  it('cambia o quita la pieza de un grupo y deja las piezas en el orden de los grupos', () => {
    const ids = ['prd-yerba-canarias', 'prd-galleta']
    expect(withPiece(ids, pieces, 'mate', 'prd-imperial-premium')).toEqual([
      'prd-imperial-premium',
      'prd-yerba-canarias',
    ])
    expect(withPiece(ids, pieces, 'bombilla', 'prd-bombillon-premium-curvo')).toEqual([
      'prd-galleta',
      'prd-bombillon-premium-curvo',
      'prd-yerba-canarias',
    ])
    expect(withPiece(ids, pieces, 'mate', '')).toEqual(['prd-yerba-canarias'])
  })

  it('lanza RangeError si la pieza no es del grupo o no se puede elegir', () => {
    expect(() => withPiece([], pieces, 'yerba', 'prd-imperial-premium')).toThrow(
      'La pieza prd-imperial-premium no es del grupo yerba.',
    )
    expect(() => withPiece([], pieces, 'mate', 'prd-no-existe')).toThrow(RangeError)
  })
})

describe('comboSummary', () => {
  const pieces = comboPieces(PRODUCTS, SAVED)

  it('suma las piezas elegidas y calcula el ahorro con el precio escrito', () => {
    expect(
      comboSummary(['prd-imperial-premium', 'prd-bombillon-premium-curvo'], pieces, 61999),
    ).toEqual({ listPriceArs: 68998, savingsArs: 6999, priceNotBelowSum: false })
  })

  it('sin precio no hay ahorro; con un precio igual o mayor a la suma, el ahorro es 0', () => {
    const ids = ['prd-galleta', 'prd-yerba-canarias']
    expect(comboSummary(ids, pieces, null)).toEqual({
      listPriceArs: 37998,
      savingsArs: null,
      priceNotBelowSum: false,
    })
    expect(comboSummary(ids, pieces, 37998)).toEqual({
      listPriceArs: 37998,
      savingsArs: 0,
      priceNotBelowSum: true,
    })
  })

  it('sin piezas elegidas la suma es 0 y no avisa', () => {
    expect(comboSummary([], pieces, 1000)).toEqual({
      listPriceArs: 0,
      savingsArs: null,
      priceNotBelowSum: false,
    })
  })
})
