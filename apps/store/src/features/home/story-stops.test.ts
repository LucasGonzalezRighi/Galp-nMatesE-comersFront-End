import { describe, expect, it } from 'vitest'
import { buildHomeData } from './home-data'
import { storyStops } from './story-stops'
import { loadFixtureCatalog } from './test/fixture-catalog'

describe('storyStops', () => {
  it('arma las seis paradas en el orden del spec, con su escena y su nombre', async () => {
    const { content } = buildHomeData(await loadFixtureCatalog())
    const stops = storyStops(content.scenes)
    expect(stops.map((stop) => stop.key)).toEqual([
      'pieces',
      'gourd',
      'bombilla',
      'yerba',
      'ritual',
      'leather',
    ])
    expect(stops.map((stop) => stop.name)).toEqual([
      'El mate',
      'El galpón',
      'La bombilla',
      'El yerbal',
      'El ritual',
      'La ronda',
    ])
    expect(stops.every((stop) => stop.scene.key === stop.key)).toBe(true)
    // Solo lo que se lee: el aspecto de cada escena vive en `HomeStory` y en `WORLD_MEDIA`.
    expect(stops.every((stop) => Object.keys(stop).length === 3)).toBe(true)
  })

  it('saltea las escenas que el contenido no trae y respeta el orden aunque vengan desordenadas', async () => {
    const { content } = buildHomeData(await loadFixtureCatalog())
    const scenes = content.scenes
      .filter((scene) => scene.key !== 'gourd' && scene.key !== 'ritual')
      .toReversed()
    expect(storyStops(scenes).map((stop) => stop.key)).toEqual([
      'pieces',
      'bombilla',
      'yerba',
      'leather',
    ])
  })
})
