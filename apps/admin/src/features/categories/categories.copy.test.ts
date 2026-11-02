import { describe, expect, it } from 'vitest'
import {
  actionsLabel,
  deleteTitle,
  dragLabel,
  moveDownLabel,
  moveUpLabel,
  publishedCount,
  storePath,
} from './categories.copy'

describe('textos de las líneas', () => {
  it('arma los nombres de los controles, la dirección y la pregunta para borrar', () => {
    expect(dragLabel('Torpedos')).toBe('Arrastrar Torpedos')
    expect(moveUpLabel('Torpedos')).toBe('Subir Torpedos')
    expect(moveDownLabel('Torpedos')).toBe('Bajar Torpedos')
    expect(actionsLabel('Torpedos')).toBe('Acciones de Torpedos')
    expect(storePath('torpedos')).toBe('/tienda/torpedos')
    expect(deleteTitle('Torpedos')).toBe('¿Borrar la línea «Torpedos»?')
    expect(publishedCount(1)).toBe('1 publicado')
    expect(publishedCount(0)).toBe('0 publicados')
  })

  it('lanza RangeError con un nombre o un slug vacío', () => {
    expect(() => dragLabel('')).toThrow(RangeError)
    expect(() => moveUpLabel(' ')).toThrow(RangeError)
    expect(() => moveDownLabel('')).toThrow(RangeError)
    expect(() => actionsLabel('  ')).toThrow(RangeError)
    expect(() => storePath('')).toThrow('El slug de la línea no puede estar vacío.')
    expect(() => deleteTitle('')).toThrow('El nombre de la línea no puede estar vacío.')
  })

  it('lanza RangeError con una cantidad imposible de publicados', () => {
    expect(() => publishedCount(-1)).toThrow(RangeError)
    expect(() => publishedCount(1.5)).toThrow(RangeError)
  })
})
