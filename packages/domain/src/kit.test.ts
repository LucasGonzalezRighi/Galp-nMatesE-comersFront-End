import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KIT_DISCOUNT_PERCENT,
  KIT_GROUP_ORDER,
  MAX_KIT_DISCOUNT_PERCENT,
  isKitComplete,
  kitSavings,
  missingKitGroups,
} from './kit'
import { pesos } from './money'

describe('constantes del kit', () => {
  it('el descuento por defecto es 10% y el máximo 30%', () => {
    expect(DEFAULT_KIT_DISCOUNT_PERCENT).toBe(10)
    expect(MAX_KIT_DISCOUNT_PERCENT).toBe(30)
  })
  it('el kit se arma en el orden mate, bombilla, yerba', () => {
    expect(KIT_GROUP_ORDER).toEqual(['mate', 'bombilla', 'yerba'])
  })
})

describe('kitSavings', () => {
  it('con 0% no hay ahorro', () => {
    expect(kitSavings(pesos(75997), 0)).toBe(0)
  })
  it('redondea al peso más cercano: 10% de $75.997 son $7.600', () => {
    expect(kitSavings(pesos(75997), 10)).toBe(7600)
  })
  it('redondea la mitad hacia arriba', () => {
    expect(kitSavings(pesos(105), 10)).toBe(11)
    expect(kitSavings(pesos(104), 10)).toBe(10)
  })
  it('acepta el máximo de 30%', () => {
    expect(kitSavings(pesos(1000), 30)).toBe(300)
  })
  it('rechaza un porcentaje mayor a 30', () => {
    expect(() => kitSavings(pesos(75997), 31)).toThrow(RangeError)
  })
  it('rechaza un porcentaje negativo', () => {
    expect(() => kitSavings(pesos(75997), -1)).toThrow(RangeError)
  })
  it('rechaza un porcentaje con decimales', () => {
    expect(() => kitSavings(pesos(75997), 10.5)).toThrow(RangeError)
  })
  it('rechaza un porcentaje que no es un número', () => {
    expect(() => kitSavings(pesos(75997), Number.NaN)).toThrow(RangeError)
  })
  it('el mensaje de error está en español y dice qué se recibió', () => {
    expect(() => kitSavings(pesos(75997), 31)).toThrow(/entero entre 0 y 30.*31/)
  })
})

describe('missingKitGroups', () => {
  it('con solo el mate faltan la bombilla y la yerba, en orden', () => {
    expect(missingKitGroups({ mate: 'x' })).toEqual(['bombilla', 'yerba'])
  })
  it('sin ninguna pieza faltan las tres', () => {
    expect(missingKitGroups({})).toEqual(['mate', 'bombilla', 'yerba'])
  })
  it('con las tres piezas no falta ninguna', () => {
    expect(missingKitGroups({ mate: 'a', bombilla: 'b', yerba: 'c' })).toEqual([])
  })
  it('no importa el orden en que se eligieron las piezas', () => {
    expect(missingKitGroups({ yerba: 'c' })).toEqual(['mate', 'bombilla'])
  })
  it('un grupo con undefined explícito cuenta como faltante', () => {
    expect(missingKitGroups({ mate: undefined, bombilla: 'b' })).toEqual(['mate', 'yerba'])
  })
})

describe('isKitComplete', () => {
  it('es verdadero con las tres piezas', () => {
    expect(isKitComplete({ mate: 'a', bombilla: 'b', yerba: 'c' })).toBe(true)
  })
  it('es falso si falta alguna', () => {
    expect(isKitComplete({ mate: 'a', bombilla: 'b' })).toBe(false)
    expect(isKitComplete({})).toBe(false)
  })
})
