import { describe, expect, it } from 'vitest'
import { asRoute } from './routes'

describe('asRoute', () => {
  it.each([['/'], ['/tienda'], ['/producto/mate-imperial'], ['/tienda?q=mate'], ['/faq#envios']])(
    'acepta la ruta interna %s',
    (path) => {
      expect(asRoute(path)).toBe(path)
    },
  )

  it.each([[''], ['tienda'], ['//otro.com'], ['https://otro.com']])(
    'rechaza %j, que no es una ruta interna',
    (path) => {
      expect(() => asRoute(path)).toThrow(RangeError)
    },
  )
})
