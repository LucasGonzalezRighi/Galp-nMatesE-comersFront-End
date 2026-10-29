import { describe, expect, it } from 'vitest'
import { buildHomeData } from './home-data'
import { MATE_STOP_COUNT } from './mate3d/keyframes'
import { HOLD_SHARE } from './stage-layout'
import { backdropOpacity, MATE_STOPS, storyScenes } from './story-stops'
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
