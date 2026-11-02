import { describe, expect, it } from 'vitest'
import { LOGO_VIEWBOX, STROKE_PX, strokeWidthFor } from './logo-layout'

describe('strokeWidthFor', () => {
  it('da el grosor en coordenadas del logo para que en pantalla mida 2 px', () => {
    expect(STROKE_PX).toBe(2)
    expect(strokeWidthFor(LOGO_VIEWBOX.width)).toBeCloseTo(2, 9)
    // Con el logo a la mitad de su tamaño, el trazo en coordenadas del logo es el doble.
    expect(strokeWidthFor(LOGO_VIEWBOX.width / 2)).toBeCloseTo(4, 9)
  })

  it('sin ancho medido (0, sin diseño) usa el de un logo de 620 px', () => {
    expect(strokeWidthFor(0)).toBe(strokeWidthFor(620))
  })

  it('lanza RangeError si el ancho es negativo o no es un número finito', () => {
    expect(() => strokeWidthFor(-1)).toThrow(RangeError)
    expect(() => strokeWidthFor(Number.NaN)).toThrow(/ancho del logo/)
    expect(() => strokeWidthFor(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})
