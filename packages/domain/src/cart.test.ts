import { describe, expect, it } from 'vitest'
import type { KitCartLine, ProductCartLine } from './cart'
import type { Leather } from './options'
import {
  addCartLine,
  cartLineKey,
  quantityByProduct,
  remainingQuantityFor,
  removeCartLine,
  setCartLineQuantity,
} from './cart'

/** Mate suelto con las opciones por defecto, salvo el cuero. */
function mateLine(quantity = 1, leather: Leather = 'Negro'): ProductCartLine {
  return {
    type: 'product',
    productId: 'm',
    quantity,
    options: { leather, ferrule: 'Alpaca cincelada' },
  }
}

/** Bombilla suelta: no tiene opciones. */
function bombillaLine(quantity = 1): ProductCartLine {
  return { type: 'product', productId: 'b', quantity }
}

/** Kit con el mate 'm', la bombilla 'b' y la yerba 'y'. */
function kitLine(quantity = 1, leather: Leather = 'Negro'): KitCartLine {
  return { type: 'kit', mateId: 'm', bombillaId: 'b', yerbaId: 'y', leather, quantity }
}

describe('cartLineKey', () => {
  it('arma la clave de un producto con sus opciones', () => {
    expect(cartLineKey(mateLine(1, 'Borravino'))).toBe('product:m:Borravino:Alpaca cincelada')
  })
  it('usa un guion cuando el producto no tiene opciones', () => {
    expect(cartLineKey(bombillaLine())).toBe('product:b:-:-')
  })
  it('arma la clave de un kit con sus tres piezas y el cuero', () => {
    expect(cartLineKey(kitLine(1, 'Crudo'))).toBe('kit:m:b:y:Crudo')
  })
  it('no depende de la cantidad', () => {
    expect(cartLineKey(mateLine(1))).toBe(cartLineKey(mateLine(7)))
    expect(cartLineKey(kitLine(1))).toBe(cartLineKey(kitLine(3)))
  })
})

describe('addCartLine', () => {
  it('suma las cantidades cuando el mismo producto tiene las mismas opciones', () => {
    const lines = addCartLine(addCartLine([], mateLine()), mateLine())
    expect(lines).toEqual([mateLine(2)])
  })
  it('deja el mismo producto con otro cuero en una línea aparte', () => {
    const lines = addCartLine([mateLine(1, 'Negro')], mateLine(1, 'Crudo'))
    expect(lines).toEqual([mateLine(1, 'Negro'), mateLine(1, 'Crudo')])
  })
  it('deja dos kits iguales con distinto cuero en dos líneas', () => {
    const lines = addCartLine([kitLine(1, 'Negro')], kitLine(1, 'Marrón'))
    expect(lines).toEqual([kitLine(1, 'Negro'), kitLine(1, 'Marrón')])
  })
  it('suma dos kits idénticos en una sola línea', () => {
    expect(addCartLine([kitLine(1)], kitLine(2))).toEqual([kitLine(3)])
  })
  it('conserva el orden: suma en el lugar de la línea existente y agrega al final lo nuevo', () => {
    const lines = addCartLine([mateLine(1), bombillaLine(1)], mateLine(1))
    expect(lines).toEqual([mateLine(2), bombillaLine(1)])
    expect(addCartLine(lines, kitLine())).toEqual([mateLine(2), bombillaLine(1), kitLine()])
  })
  it('no modifica la lista que recibe', () => {
    const original = [mateLine(1)]
    const result = addCartLine(original, mateLine(1))
    expect(original).toEqual([mateLine(1)])
    expect(result).not.toBe(original)
  })
})

describe('setCartLineQuantity', () => {
  it('cambia la cantidad de la línea con esa clave', () => {
    const lines = [mateLine(1), bombillaLine(1)]
    expect(setCartLineQuantity(lines, cartLineKey(bombillaLine()), 5)).toEqual([
      mateLine(1),
      bombillaLine(5),
    ])
  })
  it('quita la línea si la cantidad es 0', () => {
    const lines = [mateLine(2), kitLine(1)]
    expect(setCartLineQuantity(lines, cartLineKey(mateLine()), 0)).toEqual([kitLine(1)])
  })
  it('quita la línea si la cantidad es negativa', () => {
    expect(setCartLineQuantity([kitLine(2)], cartLineKey(kitLine()), -1)).toEqual([])
  })
  it('deja todo igual si no hay una línea con esa clave', () => {
    const lines = [mateLine(2)]
    expect(setCartLineQuantity(lines, 'kit:x:y:z:Negro', 4)).toEqual([mateLine(2)])
  })
  it('no modifica la lista que recibe', () => {
    const original = [mateLine(1)]
    setCartLineQuantity(original, cartLineKey(mateLine()), 9)
    expect(original).toEqual([mateLine(1)])
  })
})

describe('removeCartLine', () => {
  it('quita solo la línea con esa clave', () => {
    const lines = [mateLine(1, 'Negro'), mateLine(1, 'Crudo'), kitLine()]
    expect(removeCartLine(lines, cartLineKey(mateLine(1, 'Crudo')))).toEqual([
      mateLine(1, 'Negro'),
      kitLine(),
    ])
  })
  it('deja todo igual si no hay una línea con esa clave', () => {
    expect(removeCartLine([mateLine()], 'product:zzz:-:-')).toEqual([mateLine()])
  })
})

describe('quantityByProduct', () => {
  it('cuenta también las piezas de los kits: un mate suelto ×1 y un kit con ese mate ×2 suman 3', () => {
    const totals = quantityByProduct([mateLine(1), kitLine(2)])
    expect(totals.get('m')).toBe(3)
  })
  it('cuenta la bombilla y la yerba del kit una vez por cada kit', () => {
    const totals = quantityByProduct([kitLine(2), bombillaLine(1)])
    expect(totals.get('b')).toBe(3)
    expect(totals.get('y')).toBe(2)
  })
  it('suma las líneas del mismo producto con distintas opciones', () => {
    const totals = quantityByProduct([mateLine(1, 'Negro'), mateLine(2, 'Crudo')])
    expect(totals.get('m')).toBe(3)
  })
  it('no incluye los productos que no están en el carrito', () => {
    expect(quantityByProduct([]).size).toBe(0)
    expect(quantityByProduct([bombillaLine()]).has('m')).toBe(false)
  })
})

describe('remainingQuantityFor', () => {
  it('descuenta del stock lo que ya hay sumando líneas sueltas y kits', () => {
    expect(remainingQuantityFor('m', 3, [mateLine(1), kitLine(1)])).toBe(1)
  })
  it('con stock 50 y el carrito vacío, el tope es 20', () => {
    expect(remainingQuantityFor('m', 50, [])).toBe(20)
  })
  it('no depende de lo que haya de otros productos', () => {
    expect(remainingQuantityFor('zzz', 5, [mateLine(4), kitLine(4)])).toBe(5)
  })
  it('nunca da negativo si el carrito ya pasa el máximo', () => {
    expect(remainingQuantityFor('m', 2, [mateLine(3)])).toBe(0)
  })
  it('da 0 si no hay stock', () => {
    expect(remainingQuantityFor('m', 0, [])).toBe(0)
  })
})
