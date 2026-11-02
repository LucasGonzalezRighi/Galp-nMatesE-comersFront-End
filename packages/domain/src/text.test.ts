import { describe, expect, it } from 'vitest'
import { matchesSearch, normalizeSearchText, slugify } from './text'

describe('slugify', () => {
  it.each([
    ['Bombillón Mini Premium Pico Loro (15 cm)', 'bombillon-mini-premium-pico-loro-15-cm'],
    ['Torpedo Alpaca Cincelada c/Cuero', 'torpedo-alpaca-cincelada-c-cuero'],
    ['Yerba Canarias Té y Jengibre 1 kg', 'yerba-canarias-te-y-jengibre-1-kg'],
    ['  --Ñandú--  ', 'nandu'],
  ])('convierte "%s" en "%s"', (text, expected) => {
    expect(slugify(text)).toBe(expected)
  })
  it('devuelve una cadena vacía si no queda ningún carácter válido', () => {
    expect(slugify(' ¡¿ ?! ')).toBe('')
  })
})

describe('normalizeSearchText', () => {
  it('quita acentos, pasa a minúsculas y colapsa los espacios', () => {
    expect(normalizeSearchText('  BOMBILLÓN   Curvo ')).toBe('bombillon curvo')
  })
  it('colapsa saltos de línea y tabulaciones como espacios', () => {
    expect(normalizeSearchText('Mate\n\tImperial')).toBe('mate imperial')
  })
})

describe('matchesSearch', () => {
  it('encuentra sin importar acentos ni mayúsculas', () => {
    expect(matchesSearch('bombillon', ['Bombillón Curvo'])).toBe(true)
    expect(matchesSearch('BOMBILLÓN', ['Bombillón Curvo'])).toBe(true)
  })
  it('busca la consulta entera, con espacios y palabras sueltas como "y"', () => {
    expect(matchesSearch('te y jengibre', ['Yerba Canarias Té y Jengibre 1 kg'])).toBe(true)
    expect(matchesSearch('curvo de alpaca', ['Bombillón Curvo de Alpaca'])).toBe(true)
  })
  it('busca en el texto de todos los campos unidos con espacios', () => {
    expect(matchesSearch('curvo alpaca', ['Bombillón Curvo', 'Hecho de alpaca'])).toBe(false)
    expect(matchesSearch('curvo hecho', ['Bombillón Curvo', 'Hecho de alpaca'])).toBe(true)
  })
  it('una consulta vacía o de puros espacios encuentra todo', () => {
    expect(matchesSearch('', ['x'])).toBe(true)
    expect(matchesSearch('   ', ['x'])).toBe(true)
  })
  it('no encuentra lo que no está', () => {
    expect(matchesSearch('xyz', ['Mate'])).toBe(false)
  })
})
