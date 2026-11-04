import { describe, expect, it } from 'vitest'
import { comboLineKey } from './cart'
import {
  COMBO_MAX_ITEMS,
  COMBO_MIN_ITEMS,
  COMBO_STATUSES,
  comboHasMate,
  comboLineAmounts,
  comboMateLeathers,
  comboSavings,
  hasDistinctGroups,
} from './combo'
import { pesos } from './money'

/** Piezas del "Dúo Imperial": Mate Imperial Premium y Bombillón Premium Curvo. */
const DUO_IMPERIAL = [pesos(39999), pesos(28999)] as const

describe('constantes del combo', () => {
  it('un combo lleva de 2 a 3 productos y es borrador o publicado', () => {
    expect(COMBO_MIN_ITEMS).toBe(2)
    expect(COMBO_MAX_ITEMS).toBe(3)
    expect(COMBO_STATUSES).toEqual(['draft', 'published'])
  })
})

describe('comboSavings', () => {
  it('es la suma de las piezas menos el precio del combo', () => {
    expect(comboSavings(pesos(68998), pesos(61999))).toBe(6999)
  })

  it('nunca es negativo: si las piezas ya suman menos que el combo, es 0', () => {
    expect(comboSavings(pesos(54999), pesos(61999))).toBe(0)
    expect(comboSavings(pesos(61999), pesos(61999))).toBe(0)
  })
})

describe('comboLineAmounts', () => {
  it('"Dúo Imperial" × 2: lista 68.998 por combo, ahorro 13.998 y total 123.998', () => {
    expect(comboLineAmounts(DUO_IMPERIAL, pesos(61999), 2)).toEqual({
      grossArs: 137996,
      savingsArs: 13998,
      totalArs: 123998,
    })
  })

  it('con tres piezas el ahorro es por combo y se multiplica por la cantidad', () => {
    const torpedo = [pesos(37999), pesos(25999), pesos(12500)]
    expect(comboLineAmounts(torpedo, pesos(67999), 1)).toEqual({
      grossArs: 76498,
      savingsArs: 8499,
      totalArs: 67999,
    })
    expect(comboLineAmounts(torpedo, pesos(67999), 3).savingsArs).toBe(3 * 8499)
  })

  it('si una pieza baja y la suma queda por debajo del precio, se cobra el combo sin ahorro', () => {
    expect(comboLineAmounts([pesos(39999), pesos(15000)], pesos(61999), 2)).toEqual({
      grossArs: 123998,
      savingsArs: 0,
      totalArs: 123998,
    })
  })

  it('el total es siempre el bruto menos el ahorro', () => {
    const amounts = comboLineAmounts(DUO_IMPERIAL, pesos(61999), 5)
    expect(amounts.totalArs).toBe(amounts.grossArs - amounts.savingsArs)
  })

  it.each([[[pesos(39999)]], [[pesos(1), pesos(2), pesos(3), pesos(4)]], [[]]])(
    'rechaza un combo de %j piezas',
    (pieces) => {
      expect(() => comboLineAmounts(pieces, pesos(61999), 1)).toThrow(
        new RangeError(
          `Un combo lleva de 2 a 3 productos; se recibieron ${String(pieces.length)}.`,
        ),
      )
    },
  )

  it.each([[0], [-1], [1.5], [Number.NaN]])('rechaza la cantidad %j', (quantity) => {
    expect(() => comboLineAmounts(DUO_IMPERIAL, pesos(61999), quantity)).toThrow(RangeError)
  })

  it('rechaza un precio de combo en 0', () => {
    expect(() => comboLineAmounts(DUO_IMPERIAL, pesos(0), 1)).toThrow(
      new RangeError('El precio del combo tiene que ser mayor a 0; se recibió 0.'),
    )
  })
})

describe('hasDistinctGroups', () => {
  it.each([[['mate', 'bombilla']], [['yerba', 'mate']], [['mate', 'bombilla', 'yerba']]] as const)(
    'acepta %j',
    (groups) => {
      expect(hasDistinctGroups(groups)).toBe(true)
    },
  )

  it.each([[['mate', 'mate']], [['bombilla', 'yerba', 'bombilla']]] as const)(
    'rechaza %j: dos productos del mismo grupo',
    (groups) => {
      expect(hasDistinctGroups(groups)).toBe(false)
    },
  )
})

describe('comboHasMate', () => {
  it('dice si alguna pieza es un mate', () => {
    expect(comboHasMate(['mate', 'bombilla'])).toBe(true)
    expect(comboHasMate(['bombilla', 'yerba'])).toBe(false)
  })
})

describe('comboMateLeathers', () => {
  it('devuelve los cueros del mate del combo', () => {
    expect(
      comboMateLeathers([
        { group: 'bombilla', leathers: [] },
        { group: 'mate', leathers: ['Marrón', 'Crudo'] },
      ]),
    ).toEqual(['Marrón', 'Crudo'])
  })
  it('sin mate, ninguno', () => {
    expect(
      comboMateLeathers([
        { group: 'bombilla', leathers: [] },
        { group: 'yerba', leathers: [] },
      ]),
    ).toEqual([])
  })
  it('un mate sin cueros, ninguno', () => {
    expect(comboMateLeathers([{ group: 'mate', leathers: [] }])).toEqual([])
  })
  it('devuelve una copia', () => {
    const leathers = ['Negro'] as const
    const result = comboMateLeathers([{ group: 'mate', leathers }])
    expect(result).toEqual(['Negro'])
    expect(result).not.toBe(leathers)
  })
})

describe('comboLineKey', () => {
  it('lleva el combo y el cuero', () => {
    expect(comboLineKey('cmb-duo-imperial', { leather: 'Marrón' })).toBe(
      'combo:cmb-duo-imperial:Marrón',
    )
  })

  it('sin cuero usa un guion', () => {
    expect(comboLineKey('cmb-bombilla-y-yerba', null)).toBe('combo:cmb-bombilla-y-yerba:-')
  })

  it.each([[''], ['   ']])('rechaza un combo sin id (%j)', (comboId) => {
    expect(() => comboLineKey(comboId, null)).toThrow(
      new RangeError('El id del combo no puede estar vacío.'),
    )
  })
})
