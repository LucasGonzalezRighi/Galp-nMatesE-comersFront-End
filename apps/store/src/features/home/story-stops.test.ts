import { describe, expect, it } from 'vitest'
import { buildHomeData } from './home-data'
import { MATE_STOP_COUNT } from './mate3d/keyframes'
import { HOLD_SHARE } from './stage-layout'
import { backdropFramingStyle, backdropOpacity, MATE_STOPS, storyScenes } from './story-stops'
import { loadFixtureCatalog } from './test/fixture-catalog'

describe('storyScenes', () => {
  it('deja solo la bombilla y el ritual, en ese orden', async () => {
    const { content } = buildHomeData(await loadFixtureCatalog())
    expect(storyScenes(content.scenes).map((scene) => scene.key)).toEqual(['bombilla', 'ritual'])
    expect(storyScenes(content.scenes.toReversed()).map((scene) => scene.key)).toEqual([
      'bombilla',
      'ritual',
    ])
  })

  it('saltea la escena que el contenido no trae', async () => {
    const { content } = buildHomeData(await loadFixtureCatalog())
    const scenes = content.scenes.filter((scene) => scene.key !== 'bombilla')
    expect(storyScenes(scenes).map((scene) => scene.key)).toEqual(['ritual'])
  })
})

describe('MATE_STOPS', () => {
  it('son las tres paradas del mate con su nombre y su fondo', () => {
    expect(MATE_STOPS).toHaveLength(MATE_STOP_COUNT)
    expect(MATE_STOPS.map((stop) => [stop.key, stop.name, stop.backdrop])).toEqual([
      ['hero', 'El mate', '/hero/world/pieces.jpg'],
      ['bombilla', 'La bombilla', '/hero/world/bombilla.jpg'],
      ['ritual', 'El agua', '/hero/world/ritual.jpg'],
    ])
  })

  it('cada parada lleva el encuadre de su foto: anclaje en porcentajes y una escala de 1 o más', () => {
    for (const { framing } of MATE_STOPS) {
      expect(framing.objectPosition).toMatch(/^\d+(\.\d+)?% \d+(\.\d+)?%$/)
      expect(framing.scale).toBeGreaterThanOrEqual(1)
      // Sin pasar de 1,35: la foto (1600 px) se vería borrosa a 1905 px de ancho.
      expect(framing.scale).toBeLessThanOrEqual(1.35)
    }
  })

  it('en el vuelco la foto se corre a la izquierda: su bombilla queda fuera del mate 3D', () => {
    const [hero] = MATE_STOPS
    // Anclada a la derecha y acercada: el mate y la bombilla de la foto se corren a la izquierda.
    expect(hero?.framing.objectPosition).toMatch(/^(100|[6-9]\d)% /)
    expect(hero?.framing.scale).toBeGreaterThan(1.15)
  })
})

describe('backdropFramingStyle', () => {
  it('pone el anclaje y acerca la foto desde ese mismo punto', () => {
    expect(backdropFramingStyle({ objectPosition: '30% 50%', scale: 1.15 })).toEqual({
      objectPosition: '30% 50%',
      transform: 'scale(1.15)',
      transformOrigin: '30% 50%',
    })
  })

  it('con escala 1 solo ancla la foto, sin transformarla', () => {
    expect(backdropFramingStyle({ objectPosition: '50% 50%', scale: 1 })).toEqual({
      objectPosition: '50% 50%',
    })
  })

  it('lanza RangeError con una escala menor a 1 o un anclaje que no son dos porcentajes', () => {
    expect(() => backdropFramingStyle({ objectPosition: '50% 50%', scale: 0.9 })).toThrow(
      RangeError,
    )
    expect(() => backdropFramingStyle({ objectPosition: '50% 50%', scale: Number.NaN })).toThrow(
      RangeError,
    )
    expect(() => backdropFramingStyle({ objectPosition: 'left top', scale: 1 })).toThrow(RangeError)
  })
})

describe('backdropOpacity', () => {
  /** Avance del scroll en la parada `stop` (de 3), con `share` del tramo recorrido. */
  const at = (stop: number, share: number): number => (stop + share) / 3

  it('mientras una parada está quieta solo su fondo se ve', () => {
    const progress = at(1, HOLD_SHARE / 2)
    expect([0, 1, 2].map((index) => backdropOpacity(progress, 3, index))).toEqual([0, 1, 0])
  })

  it('durante el deslizamiento el siguiente aparece encima con la curva del recorrido', () => {
    const early = backdropOpacity(at(0, HOLD_SHARE + (1 - HOLD_SHARE) * 0.25), 3, 1)
    const middle = backdropOpacity(at(0, HOLD_SHARE + (1 - HOLD_SHARE) * 0.5), 3, 1)
    const late = backdropOpacity(at(0, HOLD_SHARE + (1 - HOLD_SHARE) * 0.75), 3, 1)
    expect(early).toBeGreaterThan(0)
    expect(early).toBeLessThan(0.25)
    expect(middle).toBeCloseTo(0.5)
    expect(late).toBeGreaterThan(0.75)
    // El que se va queda entero debajo hasta que lo tapa el siguiente.
    expect(backdropOpacity(at(0, 0.9), 3, 0)).toBe(1)
    expect(backdropOpacity(at(0, 0.9), 3, 2)).toBe(0)
  })

  it('el último fondo queda entero hasta el final', () => {
    expect(backdropOpacity(1, 3, 2)).toBe(1)
    expect(backdropOpacity(1, 3, 1)).toBe(0)
  })

  it('lanza RangeError con un fondo que no existe', () => {
    expect(() => backdropOpacity(0, 3, 3)).toThrow(RangeError)
    expect(() => backdropOpacity(0, 3, 0.5)).toThrow(RangeError)
    expect(() => backdropOpacity(Number.NaN, 3, 0)).toThrow(RangeError)
  })
})
