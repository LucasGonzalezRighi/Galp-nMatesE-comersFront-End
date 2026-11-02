import { describe, expect, it } from 'vitest'
import {
  bridgeLook,
  CARD_STAGGER,
  cardLook,
  ENTRANCE_SHARE,
  sineShare,
  titleLook,
} from './collection-entrance'

describe('sineShare', () => {
  it('va de 0 a 1 dentro del tramo con la curva senoidal y se recorta fuera de él', () => {
    expect(sineShare(0.1, 0.2, 0.6)).toBe(0)
    expect(sineShare(0.2, 0.2, 0.6)).toBe(0)
    expect(sineShare(0.4, 0.2, 0.6)).toBeCloseTo(0.5, 9)
    expect(sineShare(0.6, 0.2, 0.6)).toBe(1)
    expect(sineShare(0.9, 0.2, 0.6)).toBe(1)
    // Senoidal: arranca despacio (a un cuarto del tramo va menos de un cuarto).
    expect(sineShare(0.3, 0.2, 0.6)).toBeLessThan(0.25)
  })

  it('lanza RangeError si el avance no es un número o el tramo no va de menor a mayor', () => {
    expect(() => sineShare(Number.NaN, 0, 1)).toThrow(RangeError)
    expect(() => sineShare(0.5, 0.6, 0.2)).toThrow(RangeError)
    expect(() => sineShare(0.5, 0.2, 0.2)).toThrow(/tramo/)
  })
})

describe('la entrada de la colección', () => {
  it('termina cuando la colección llega al 15 % de arriba de la ventana', () => {
    expect(ENTRANCE_SHARE).toBeCloseTo(0.85, 9)
  })

  it('la capa de yerba arranca entera y nítida, se aleja (1,15 → 1), se desenfoca hasta 10 px y se disuelve', () => {
    expect(bridgeLook(0)).toEqual({ transform: 'scale(1.15)', filter: 'none', opacity: 1 })
    // Se aleja y se desenfoca en los primeros tres cuartos; se disuelve recién con la colección arriba.
    expect(bridgeLook(0.75)).toMatchObject({ transform: 'scale(1)', filter: 'blur(10px)' })
    const middle = bridgeLook(0.6)
    expect(middle.opacity).toBeGreaterThan(0)
    expect(middle.opacity).toBeLessThan(1)
    expect(middle.filter).toMatch(/^blur\(\d+(\.\d+)?px\)$/)
    expect(bridgeLook(1)).toEqual({ transform: 'scale(1)', filter: 'blur(10px)', opacity: 0 })
  })

  it('nunca deja más de un tercio de pantalla de fondo liso: la yerba sigue detrás mientras la colección sube', () => {
    // El borde de arriba de la colección está a 1 − 0,85 · avance pantallas de arriba y el título,
    // hasta 0,1 pantalla más abajo. Arriba de eso se ve la yerba o, cuando se disuelve, el fondo liso.
    const titleOffset = 0.1
    for (let step = 0; step <= 100; step += 1) {
      const progress = step / 100
      const above = Math.min(1, 1 - ENTRANCE_SHARE * progress + titleOffset)
      expect(above * (1 - bridgeLook(progress).opacity)).toBeLessThanOrEqual(1 / 3)
    }
  })

  it('el título y la primera tarjeta ya vienen saliendo de la profundidad cuando asoman abajo', () => {
    // El título asoma cerca de 0,1 de la entrada y la primera hilera cerca de 0,22.
    const rise = Number(/translateY\((.+)%\)/.exec(titleLook(0.15).transform)?.[1] ?? 0)
    expect(rise).toBeLessThan(50)
    expect(cardLook(0.22, 0).opacity).toBeGreaterThan(0.3)
  })

  it('el título sube con máscara desde abajo y termina sin transformación', () => {
    expect(titleLook(0).transform).toBe('translateY(110%)')
    expect(titleLook(1).transform).toBe('none')
  })

  it('cada tarjeta sale de la profundidad: de translateZ(−600px), rotateX(10deg), escala 0,7 y 12 px de desenfoque a su lugar', () => {
    expect(cardLook(0, 0)).toEqual({
      transform: 'perspective(1200px) translateZ(-600px) rotateX(10deg) scale(0.7)',
      filter: 'blur(12px)',
      opacity: 0,
    })
    expect(cardLook(1, 0)).toEqual({ transform: 'none', filter: 'none', opacity: 1 })
    // La última de siete (seis líneas y "Ver todo el catálogo") también termina al final.
    expect(cardLook(1, 6)).toEqual({ transform: 'none', filter: 'none', opacity: 1 })
  })

  it('las tarjetas salen una tras otra, desfasadas 0,08 del avance', () => {
    expect(CARD_STAGGER).toBe(0.08)
    const at = 0.35
    const opacities = [0, 1, 2, 3].map((index) => cardLook(at, index).opacity)
    expect(opacities).toEqual([...opacities].sort((a, b) => b - a))
    expect(opacities[0]).toBeGreaterThan(opacities[3] ?? 1)
    // La segunda está, con 0,08 más de avance, donde estaba la primera.
    expect(cardLook(at + CARD_STAGGER, 1)).toEqual(cardLook(at, 0))
  })

  it('lanza RangeError si el avance no es de 0 a 1 o la tarjeta no es un entero desde 0', () => {
    expect(() => cardLook(1.2, 0)).toThrow(RangeError)
    expect(() => cardLook(0.5, -1)).toThrow(RangeError)
    expect(() => cardLook(0.5, 1.5)).toThrow(/tarjeta/)
    expect(() => bridgeLook(Number.NaN)).toThrow(RangeError)
    expect(() => titleLook(-0.1)).toThrow(RangeError)
  })
})
