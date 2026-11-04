import { describe, expect, it } from 'vitest'
import * as options from './options'
import {
  DEFAULT_LEATHER,
  LEATHERS,
  initialLeather,
  isLeather,
  normalizeLeathers,
  resolveLeather,
} from './options'

describe('options', () => {
  it('lista los cueros con los valores exactos y en ese orden', () => {
    expect(LEATHERS).toEqual(['Negro', 'Marrón', 'Crudo', 'Borravino'])
  })
  it('define el cuero por defecto y pertenece a la lista', () => {
    expect(DEFAULT_LEATHER).toBe('Negro')
    expect(LEATHERS).toContain(DEFAULT_LEATHER)
  })
  it('ya no exporta virolas', () => {
    expect(Object.keys(options).filter((name) => /ferrule/i.test(name))).toEqual([])
  })
  it('reconoce los cueros válidos y rechaza el resto', () => {
    expect(isLeather('Borravino')).toBe(true)
    expect(isLeather('Rosa')).toBe(false)
    expect(isLeather('negro')).toBe(false)
  })
})

describe('initialLeather', () => {
  it('arranca en Negro si se ofrece', () => {
    expect(initialLeather(['Crudo', 'Negro'])).toBe('Negro')
  })
  it('sin Negro, arranca en el primero ofrecido', () => {
    expect(initialLeather(['Crudo', 'Borravino'])).toBe('Crudo')
  })
  it('sin cueros, null', () => {
    expect(initialLeather([])).toBeNull()
  })
})

describe('normalizeLeathers', () => {
  it('saca los repetidos y ordena como LEATHERS', () => {
    expect(normalizeLeathers(['Borravino', 'Negro', 'Negro'])).toEqual(['Negro', 'Borravino'])
  })
  it('deja los cuatro en el orden canónico y no toca la lista recibida', () => {
    const list = ['Crudo', 'Borravino', 'Marrón', 'Negro'] as const
    expect(normalizeLeathers(list)).toEqual(['Negro', 'Marrón', 'Crudo', 'Borravino'])
    expect(list).toEqual(['Crudo', 'Borravino', 'Marrón', 'Negro'])
  })
  it('una lista vacía queda vacía', () => {
    expect(normalizeLeathers([])).toEqual([])
  })
  it('lanza RangeError si alguno no es un cuero', () => {
    expect(() => normalizeLeathers(['Negro', 'Rosa'] as never)).toThrow(RangeError)
    expect(() => normalizeLeathers(['Rosa'] as never)).toThrow('no es un cuero')
  })
})

describe('resolveLeather', () => {
  it('se queda con el elegido si se ofrece', () => {
    expect(resolveLeather('Crudo', ['Negro', 'Crudo'])).toBe('Crudo')
  })
  it('si el elegido no se ofrece, pasa al inicial de los ofrecidos', () => {
    expect(resolveLeather('Borravino', ['Marrón', 'Crudo'])).toBe('Marrón')
  })
  it('sin cueros ofrecidos, null', () => {
    expect(resolveLeather('Negro', [])).toBeNull()
  })
  it('sin elegido, el inicial', () => {
    expect(resolveLeather(null, ['Crudo'])).toBe('Crudo')
  })
})
