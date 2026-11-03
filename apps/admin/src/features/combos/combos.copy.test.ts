import { describe, expect, it } from 'vitest'
import {
  actionsLabel,
  deleteTitle,
  dragLabel,
  moveDownLabel,
  moveUpLabel,
  pieceOptionLabel,
  piecesText,
  savingsText,
  summaryText,
  unavailablePieceLabel,
} from './combos.copy'

describe('textos de los combos', () => {
  it('arma los nombres de los controles y la pregunta para borrar', () => {
    expect(dragLabel('Dúo Imperial')).toBe('Arrastrar Dúo Imperial')
    expect(moveUpLabel('Dúo Imperial')).toBe('Subir Dúo Imperial')
    expect(moveDownLabel('Dúo Imperial')).toBe('Bajar Dúo Imperial')
    expect(actionsLabel('Dúo Imperial')).toBe('Acciones de Dúo Imperial')
    expect(deleteTitle('Dúo Imperial')).toBe('¿Borrar el combo «Dúo Imperial»?')
  })

  it('une las piezas con " + " y arma las opciones de cada lista', () => {
    expect(piecesText(['Mate Imperial Premium', 'Bombillón Premium Curvo'])).toBe(
      'Mate Imperial Premium + Bombillón Premium Curvo',
    )
    expect(pieceOptionLabel('Mate Imperial Premium', 39999)).toBe('Mate Imperial Premium · $39.999')
    expect(unavailablePieceLabel('Mate Galleta')).toBe('Mate Galleta (no disponible)')
  })

  it('arma la suma y el ahorro en pesos', () => {
    expect(summaryText(68998, 6999)).toBe('Suma de las piezas $68.998 · Ahorro $6.999')
    expect(summaryText(68998, null)).toBe('Suma de las piezas $68.998')
    expect(savingsText(6999)).toBe('Ahorro $6.999')
  })

  it('lanza RangeError con un nombre vacío o una lista sin piezas', () => {
    expect(() => dragLabel('')).toThrow('El nombre del combo no puede estar vacío.')
    expect(() => moveUpLabel(' ')).toThrow(RangeError)
    expect(() => moveDownLabel('')).toThrow(RangeError)
    expect(() => actionsLabel('  ')).toThrow(RangeError)
    expect(() => deleteTitle('')).toThrow(RangeError)
    expect(() => piecesText([])).toThrow('El combo tiene que tener al menos una pieza.')
    expect(() => piecesText(['Mate', ' '])).toThrow(RangeError)
    expect(() => pieceOptionLabel('', 100)).toThrow(RangeError)
    expect(() => unavailablePieceLabel('')).toThrow(RangeError)
  })

  it('lanza RangeError con montos que no son pesos enteros desde 0', () => {
    expect(() => summaryText(-1, null)).toThrow(RangeError)
    expect(() => summaryText(100, 1.5)).toThrow(RangeError)
    expect(() => savingsText(-5)).toThrow(RangeError)
    expect(() => pieceOptionLabel('Mate', Number.NaN)).toThrow(RangeError)
  })
})
