import { describe, expect, it } from 'vitest'
import type { MatePart } from './mate-parts'
import { cellShowsPart, MATE_PARTS, partOfReview, placeNotes, PART_ORDER } from './mate-parts'

/** Una reseña de prueba sobre un mate. */
const mate = (text: string) => ({ text, product: { name: 'Mate Imperial Premium' } })

describe('partOfReview', () => {
  it('reconoce cada parte por las palabras con que la nombra la gente, con o sin tilde', () => {
    expect(partOfReview(mate('El bombillón tira parejo.'))).toBe('bombilla')
    expect(partOfReview(mate('El pico de rey en bronce es un lujo.'))).toBe('bombilla')
    expect(partOfReview(mate('La virola tiene el cincelado parejo.'))).toBe('virola')
    expect(partOfReview(mate('Es chiquito pero la boca es cómoda para cebar.'))).toBe('boca')
    expect(partOfReview(mate('Lo curé con yerba usada dos días.'))).toBe('boca')
    expect(partOfReview(mate('Muy lindo, la costura cruzada es impecable.'))).toBe('cuero')
    expect(partOfReview(mate('Las patitas no rayan el escritorio.'))).toBe('pie')
    expect(partOfReview(mate('Lo elegí por el pie con pelotitas.'))).toBe('pie')
  })

  it('si nombra varias, gana la que nombra primero', () => {
    expect(
      partOfReview(mate('La virola es una joya y el pie con las pelotitas le da presencia.')),
    ).toBe('virola')
    expect(partOfReview(mate('Boca amplia, base firme y el pelo le da onda.'))).toBe('boca')
    expect(partOfReview(mate('El cuero es muy prolijo y la base de alpaca pesa lo justo.'))).toBe(
      'cuero',
    )
  })

  it('no confunde palabras que solo empiezan igual', () => {
    expect(partOfReview(mate('Llegaron todas las piezas. Muy bien embalado.'))).toBe('cuero')
    expect(partOfReview(mate('Lo usamos en la pileta y aguanta.'))).toBe('cuero')
  })

  it('sin ninguna parte nombrada, va a la del producto', () => {
    const text = 'Llegó rápido y muy bien embalado.'
    expect(partOfReview({ text, product: { name: 'Bombillón 100% Alpaca' } })).toBe('bombilla')
    expect(partOfReview({ text, product: { name: 'Yerba Canarias 1 kg' } })).toBe('boca')
    expect(partOfReview({ text, product: { name: 'Mate Galleta' } })).toBe('cuero')
  })
})

describe('cellShowsPart', () => {
  it('cada parte se ve en la celda de su punto', () => {
    for (const part of PART_ORDER) {
      expect(cellShowsPart(part, MATE_PARTS[part].spot, 0)).toBe(true)
    }
  })

  it('la bombilla sigue su trazo en diagonal y no ocupa la esquina de abajo a la izquierda', () => {
    expect(cellShowsPart('bombilla', { x: 0.78, y: 0.5 }, 0.0625)).toBe(true)
    expect(cellShowsPart('bombilla', { x: 0.1, y: 0.9 }, 0.0625)).toBe(false)
  })

  it('las esquinas del recorte no muestran ninguna parte', () => {
    for (const part of PART_ORDER) {
      expect(cellShowsPart(part, { x: 0.06, y: 0.06 }, 0.0625)).toBe(false)
    }
  })
})

describe('placeNotes', () => {
  /** Notas de prueba: la parte es el propio dato. */
  const place = (parts: MatePart[]) => placeNotes(parts, (part) => part)

  it('cada nota va del lado de su parte, ordenadas de arriba abajo como en la foto', () => {
    const { left, right } = place(['pie', 'cuero', 'boca', 'bombilla'])
    expect(left.map((note) => note.part)).toEqual(['boca', 'pie'])
    expect(right.map((note) => note.part)).toEqual(['bombilla', 'cuero'])
    expect(left.map((note) => note.slot)).toEqual([0, 1])
  })

  it('emparejan las columnas pasando al otro lado la nota más cerca del centro', () => {
    const { left, right } = place([
      'virola',
      'virola',
      'boca',
      'boca',
      'pie',
      'pie',
      'bombilla',
      'bombilla',
      'cuero',
      'cuero',
    ])
    expect(left.map((note) => note.part)).toEqual(['boca', 'boca', 'virola', 'virola', 'pie'])
    expect(right.map((note) => note.part)).toEqual([
      'bombilla',
      'bombilla',
      'cuero',
      'cuero',
      'pie',
    ])
  })

  it('entran hasta cinco por lado', () => {
    const { left, right } = place(Array.from({ length: 14 }, () => 'virola' as const))
    expect(left).toHaveLength(5)
    expect(right).toHaveLength(5)
  })

  it('sin reseñas no hay notas', () => {
    expect(place([])).toEqual({ left: [], right: [] })
  })
})
