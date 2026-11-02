import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FERRULE,
  DEFAULT_LEATHER,
  FERRULES,
  KIT_FERRULE,
  LEATHERS,
  isFerrule,
  isLeather,
} from './options'

describe('options', () => {
  it('lista los cueros con los valores exactos y en ese orden', () => {
    expect(LEATHERS).toEqual(['Negro', 'Marrón', 'Crudo', 'Borravino'])
  })
  it('lista las virolas con los valores exactos y en ese orden', () => {
    expect(FERRULES).toEqual(['Alpaca lisa', 'Alpaca cincelada', 'Acero'])
  })
  it('define los valores por defecto', () => {
    expect(DEFAULT_LEATHER).toBe('Negro')
    expect(DEFAULT_FERRULE).toBe('Alpaca cincelada')
    expect(KIT_FERRULE).toBe('Alpaca cincelada')
  })
  it('los valores por defecto pertenecen a sus listas', () => {
    expect(LEATHERS).toContain(DEFAULT_LEATHER)
    expect(FERRULES).toContain(DEFAULT_FERRULE)
    expect(FERRULES).toContain(KIT_FERRULE)
  })
  it('reconoce los cueros válidos y rechaza el resto', () => {
    expect(isLeather('Borravino')).toBe(true)
    expect(isLeather('Rosa')).toBe(false)
    expect(isLeather('negro')).toBe(false)
  })
  it('reconoce las virolas válidas y rechaza el resto', () => {
    expect(isFerrule('Acero')).toBe(true)
    expect(isFerrule('Oro')).toBe(false)
    expect(isFerrule('acero')).toBe(false)
  })
})
