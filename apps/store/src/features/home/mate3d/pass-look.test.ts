import { describe, expect, it } from 'vitest'
import { PASS_BLUR_PX, passLook } from './pass-look'

/** Los píxeles del desenfoque de un `filter` (0 si es `none`). */
function blurOf(filter: string): number {
  if (filter === 'none') return 0
  const match = /^blur\((\d+(?:\.\d)?)px\)$/.exec(filter)
  if (match === null) throw new Error(`El filtro "${filter}" no es un desenfoque.`)
  return Number(match[1])
}

/**
 * El desenfoque máximo, como número: la medición de rendimiento puede dejarlo en 0 y estas pruebas
 * siguen valiendo.
 */
const MAX_BLUR: number = PASS_BLUR_PX

/** Las alturas del mate de −0,5 a 3, de a 0,01. */
const HEIGHTS = Array.from({ length: 351 }, (_, step) => Math.round(step - 50) / 100)

describe('passLook', () => {
  it('en las paradas (el mate abajo) no hay filtro y la capa se ve entera', () => {
    expect(passLook(-0.1)).toEqual({ filter: 'none', opacity: 1 })
    expect(passLook(0.45)).toEqual({ filter: 'none', opacity: 1 })
  })

  it('en 1,4 el desenfoque llega a PASS_BLUR_PX (sin ceros de más) y en 1,75 la capa ya no se ve', () => {
    expect(passLook(1.4).filter).toBe(MAX_BLUR === 0 ? 'none' : `blur(${String(MAX_BLUR)}px)`)
    expect(passLook(1.35).opacity).toBe(1)
    expect(passLook(1.75).opacity).toBe(0)
    // Ya sin verse, la capa no se sigue desenfocando.
    expect(passLook(1.8)).toEqual({ filter: 'none', opacity: 0 })
  })

  it('a mitad de la subida el desenfoque va entre 0 y PASS_BLUR_PX', () => {
    const blur = blurOf(passLook(0.97).filter)
    expect(blur).toBeLessThan(MAX_BLUR === 0 ? 1 : MAX_BLUR)
    expect(blur > 0).toBe(MAX_BLUR > 0)
  })

  it('nunca pasa de PASS_BLUR_PX, redondea a 0,1 px y a dos decimales y no vuelve atrás al subir', () => {
    let previous = passLook(HEIGHTS[0] ?? -0.5)
    for (const height of HEIGHTS) {
      const look = passLook(height)
      const blur = blurOf(look.filter)
      expect(blur).toBeLessThanOrEqual(MAX_BLUR)
      expect(Math.round(look.opacity * 100) / 100).toBe(look.opacity)
      expect(look.opacity).toBeLessThanOrEqual(previous.opacity)
      if (look.opacity > 0) expect(blur).toBeGreaterThanOrEqual(blurOf(previous.filter))
      previous = look
    }
  })

  it('lanza RangeError si la altura no es un número finito', () => {
    for (const height of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => passLook(height)).toThrow(RangeError)
    }
    expect(() => passLook(Number.NaN)).toThrow(/altura del mate/)
  })
})
