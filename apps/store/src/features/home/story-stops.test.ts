import { describe, expect, it } from 'vitest'
import { buildHomeData } from './home-data'
import { storyStops } from './story-stops'
import { loadFixtureCatalog } from './test/fixture-catalog'

describe('storyStops', () => {
  it('arma las seis paradas en el orden del spec, con su nombre, tono y fondo', async () => {
    const { content, story } = buildHomeData(await loadFixtureCatalog())
    const stops = storyStops(content.scenes, story)
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
    expect(stops.map((stop) => stop.tone)).toEqual([
      'light',
      'dark',
      'dark',
      'light',
      'dark',
      'light',
    ])
    expect(stops.map((stop) => stop.background)).toEqual([
      null,
      'gourd',
      'bombilla',
      null,
      'hero',
      null,
    ])
    expect(stops.every((stop) => stop.scene.key === stop.key)).toBe(true)
  })

  it('cada parada muestra su pieza: el mate, el mate grande, el bombillón, la yerba, el mate y el mate', async () => {
    const { content, story } = buildHomeData(await loadFixtureCatalog())
    const stops = storyStops(content.scenes, story)
    expect(stops.map((stop) => stop.visual?.id)).toEqual([
      story.hero?.id,
      story.hero?.id,
      story.bombillas[0]?.id,
      story.yerbas[0]?.id,
      story.hero?.id,
      story.hero?.id,
    ])
    expect(stops.map((stop) => stop.visualScale)).toEqual([1, 1.12, 1, 1, 1, 1])
  })

  it('saltea las escenas que el contenido no trae y respeta el orden aunque vengan desordenadas', async () => {
    const { content, story } = buildHomeData(await loadFixtureCatalog())
    const scenes = content.scenes
      .filter((scene) => scene.key !== 'gourd' && scene.key !== 'ritual')
      .toReversed()
    expect(storyStops(scenes, story).map((stop) => stop.key)).toEqual([
      'pieces',
      'bombilla',
      'yerba',
      'leather',
    ])
  })

  it('sin bombillas ni yerbas comprables esas paradas quedan sin pieza', async () => {
    const { content, story } = buildHomeData(await loadFixtureCatalog())
    const stops = storyStops(content.scenes, { ...story, bombillas: [], yerbas: [] })
    expect(stops.find((stop) => stop.key === 'bombilla')?.visual).toBeNull()
    expect(stops.find((stop) => stop.key === 'yerba')?.visual).toBeNull()
  })
})
