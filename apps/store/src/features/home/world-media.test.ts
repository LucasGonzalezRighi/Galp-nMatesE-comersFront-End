import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildHomeData } from './home-data'
import { HOLD_SHARE } from './stage-layout'
import { loadFixtureCatalog } from './test/fixture-catalog'
import { WORLD_MEDIA, WORLD_ORDER, worldLayer, worldStops } from './world-media'

describe('WORLD_ORDER y WORLD_MEDIA', () => {
  it('el relato va del yerbal a la ronda', () => {
    expect(WORLD_ORDER).toEqual(['yerba', 'gourd', 'pieces', 'bombilla', 'ritual', 'leather'])
  })

  it('cada parada tiene su poster de 1600 × 893 en /hero/world y todavía ningún clip', () => {
    for (const key of WORLD_ORDER) {
      expect(WORLD_MEDIA[key]).toEqual({
        poster: `/hero/world/${key}.jpg`,
        width: 1600,
        height: 893,
        clip: null,
      })
    }
  })

  it('documenta que el galpón usa provisoriamente el cuadro del mate', () => {
    const source = readFileSync(new URL('./world-media.ts', import.meta.url), 'utf8')
    expect(source).toMatch(/gourd[^\n]*provisori/i)
  })
})

describe('worldStops', () => {
  it('ordena las paradas según el relato y les suma su media', async () => {
    const { content, story } = buildHomeData(await loadFixtureCatalog())
    const stops = worldStops(content.scenes, story)
    expect(stops.map((stop) => stop.key)).toEqual([...WORLD_ORDER])
    expect(stops.map((stop) => stop.name)).toEqual([
      'El yerbal',
      'El galpón',
      'El mate',
      'La bombilla',
      'El ritual',
      'La ronda',
    ])
    expect(stops.every((stop) => stop.media === WORLD_MEDIA[stop.key])).toBe(true)
    expect(stops.every((stop) => stop.scene.key === stop.key)).toBe(true)
  })

  it('saltea las escenas que el contenido no trae', async () => {
    const { content, story } = buildHomeData(await loadFixtureCatalog())
    const scenes = content.scenes.filter((scene) => scene.key !== 'gourd' && scene.key !== 'ritual')
    expect(worldStops(scenes, story).map((stop) => stop.key)).toEqual([
      'yerba',
      'pieces',
      'bombilla',
      'leather',
    ])
    expect(worldStops([], story)).toEqual([])
  })
})

describe('worldLayer', () => {
  /** Avance del scroll en la parada `stop` (de 6), con `share` del tramo recorrido. */
  const at = (stop: number, share: number): number => (stop + share) / 6

  it('mientras una parada está quieta solo su capa se ve', () => {
    const progress = at(2, HOLD_SHARE / 2)
    expect([0, 1, 2, 3, 4, 5].map((index) => worldLayer(progress, 6, index).opacity)).toEqual([
      0, 0, 1, 0, 0, 0,
    ])
  })

  it('durante el deslizamiento la siguiente aparece encima con la curva del paseo', () => {
    const early = worldLayer(at(1, HOLD_SHARE + (1 - HOLD_SHARE) * 0.25), 6, 2).opacity
    const middle = worldLayer(at(1, HOLD_SHARE + (1 - HOLD_SHARE) * 0.5), 6, 2).opacity
    const late = worldLayer(at(1, HOLD_SHARE + (1 - HOLD_SHARE) * 0.75), 6, 2).opacity
    expect(early).toBeGreaterThan(0)
    expect(early).toBeLessThan(0.25)
    expect(middle).toBeCloseTo(0.5)
    expect(late).toBeGreaterThan(0.75)
    // La que se va queda entera debajo hasta que la tapa la siguiente.
    expect(worldLayer(at(1, 0.9), 6, 1).opacity).toBe(1)
    expect(worldLayer(at(1, 0.9), 6, 3).opacity).toBe(0)
  })

  it('el avance local recorre el tramo de la capa de 0 a 1 y nunca retrocede', () => {
    expect(worldLayer(at(3, 0), 6, 3).local).toBe(0)
    expect(worldLayer(at(3, 0.5), 6, 3).local).toBeCloseTo(0.5)
    expect(worldLayer(at(2, 0.9), 6, 3).local).toBe(0)
    expect(worldLayer(at(4, 0.1), 6, 3).local).toBe(1)
    const steps = Array.from({ length: 41 }, (_, step) => worldLayer(at(3, step / 40), 6, 3).local)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
  })

  it('la última capa se queda entera hasta el final y el avance se recorta', () => {
    expect(worldLayer(1, 6, 5)).toEqual({ opacity: 1, local: 1 })
    expect(worldLayer(-2, 6, 0)).toEqual({ opacity: 1, local: 0 })
    expect(worldLayer(3, 6, 4).opacity).toBe(0)
  })

  it('valida la capa y delega en stageLayout el avance y la cantidad', () => {
    expect(() => worldLayer(0, 6, 6)).toThrow(RangeError)
    expect(() => worldLayer(0, 6, 1.5)).toThrow(/entero de 0 a 5/)
    expect(() => worldLayer(Number.NaN, 6, 0)).toThrow(RangeError)
    expect(() => worldLayer(0, 0, 0)).toThrow(RangeError)
  })
})
