import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildHomeData } from './home-data'
import { HOLD_SHARE } from './stage-layout'
import { loadFixtureCatalog } from './test/fixture-catalog'
import {
  diveTransform,
  FADE_SHARE,
  WORLD_DIVE,
  WORLD_MEDIA,
  WORLD_ORDER,
  worldFade,
  worldLayer,
  worldStops,
} from './world-media'

describe('WORLD_ORDER y WORLD_MEDIA', () => {
  it('el relato va del yerbal a la ronda', () => {
    expect(WORLD_ORDER).toEqual(['yerba', 'gourd', 'pieces', 'bombilla', 'ritual', 'leather'])
  })

  it('cada parada tiene su poster de 1600 × 893 en /hero/world y todavía ningún clip', () => {
    for (const key of WORLD_ORDER) {
      expect(WORLD_MEDIA[key]).toMatchObject({
        poster: `/hero/world/${key}.jpg`,
        width: 1600,
        height: 893,
        clip: null,
      })
    }
  })

  it('el mate se encuadra a la derecha, lejos de la columna de texto y de sus botones', () => {
    const { framing, mouth } = WORLD_MEDIA.pieces
    expect(framing.anchor.x).toBe(0)
    expect(framing.zoom).toBeGreaterThan(1)
    expect(mouth?.x).toBeGreaterThan(0.55)
  })

  it('las hojas caen en el mate y el vapor sube en el ritual y la ronda; las demás, quietas', () => {
    expect(WORLD_ORDER.map((key) => WORLD_MEDIA[key].life)).toEqual([
      null,
      null,
      'leaves',
      null,
      'steam',
      'steam',
    ])
    // Lo que se mueve sale de la boca del mate o va hacia ella.
    for (const key of WORLD_ORDER) {
      const { life, mouth } = WORLD_MEDIA[key]
      if (life !== null) expect(mouth).not.toBeNull()
      if (mouth !== null) {
        expect([mouth.x, mouth.y].every((value) => value > 0 && value < 1)).toBe(true)
      }
    }
  })

  it('documenta que el galpón usa provisoriamente el cuadro del mate', () => {
    const source = readFileSync(new URL('./world-media.ts', import.meta.url), 'utf8')
    expect(source).toMatch(/gourd[^\n]*provisori/i)
  })
})

describe('worldStops', () => {
  it('ordena las paradas según el relato y les suma su media', async () => {
    const { content } = buildHomeData(await loadFixtureCatalog())
    const stops = worldStops(content.scenes)
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
    const { content } = buildHomeData(await loadFixtureCatalog())
    const scenes = content.scenes.filter((scene) => scene.key !== 'gourd' && scene.key !== 'ritual')
    expect(worldStops(scenes).map((stop) => stop.key)).toEqual([
      'yerba',
      'pieces',
      'bombilla',
      'leather',
    ])
    expect(worldStops([])).toEqual([])
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

describe('diveTransform', () => {
  it('la zambullida va del mate a la bombilla, que son vecinas en el relato', () => {
    expect(WORLD_DIVE).toEqual({ from: 'pieces', to: 'bombilla' })
    expect(WORLD_ORDER.indexOf(WORLD_DIVE.to) - WORLD_ORDER.indexOf(WORLD_DIVE.from)).toBe(1)
  })

  it('el cuadro que se deja crece de 1 a 2,2 y el que llega, de 0,92 a 1', () => {
    expect(diveTransform(0)).toEqual({ leaving: 1, arriving: 0.92, pan: 0 })
    const end = diveTransform(1)
    expect(end.leaving).toBeCloseTo(2.2)
    expect(end.arriving).toBe(1)
    // A velocidad pareja: a mitad de camino, la media geométrica.
    const middle = diveTransform(0.5)
    expect(middle.leaving).toBeCloseTo(Math.sqrt(2.2))
    expect(middle.arriving).toBeCloseTo(Math.sqrt(0.92))
  })

  it('nunca retrocede: las dos escalas crecen con el avance', () => {
    const steps = Array.from({ length: 21 }, (_, step) => diveTransform(step / 20))
    for (const [position, step] of steps.entries()) {
      const previous = steps[position - 1]
      if (previous === undefined) continue
      expect(step.leaving).toBeGreaterThan(previous.leaving)
      expect(step.arriving).toBeGreaterThan(previous.arriving)
      expect(step.pan).toBeGreaterThanOrEqual(previous.pan)
    }
  })

  it('la boca del mate que se deja llega a la del cuadro que entra a mitad de camino', () => {
    expect(diveTransform(0.25).pan).toBeCloseTo(0.5)
    expect(diveTransform(0.5).pan).toBe(1)
    expect(diveTransform(1).pan).toBe(1)
  })

  it('el cuadro que llega cubre siempre la pantalla, aun en su escala más chica', () => {
    const { framing, mouth } = WORLD_MEDIA[WORLD_DIVE.to]
    if (mouth === null) throw new Error('El cuadro de la bombilla necesita la boca del mate.')
    const smallest = diveTransform(0).arriving
    for (const axis of ['x', 'y'] as const) {
      // El poster se acerca alrededor de su ancla y la capa se achica alrededor de la boca.
      const anchor = framing.anchor[axis]
      const start = anchor - anchor * framing.zoom
      const end = anchor + (1 - anchor) * framing.zoom
      const origin = mouth[axis]
      expect(origin + smallest * (start - origin)).toBeLessThanOrEqual(0)
      expect(origin + smallest * (end - origin)).toBeGreaterThanOrEqual(1)
    }
  })

  it.each([[-0.1], [1.1], [Number.NaN]])('rechaza el avance %s', (progress) => {
    expect(() => diveTransform(progress)).toThrow(RangeError)
  })
})

describe('worldFade', () => {
  /** Avance del scroll en la parada `stop` (de 6), con `share` del tramo recorrido. */
  const at = (stop: number, share: number): number => (stop + share) / 6

  it('el mundo se funde a negro solo en el final del tramo de la ronda', () => {
    expect(worldFade(0, 6)).toBe(0)
    expect(worldFade(at(4, 0.9), 6)).toBe(0)
    expect(worldFade(at(5, 1 - FADE_SHARE), 6)).toBeCloseTo(0, 10)
    expect(worldFade(at(5, 1 - FADE_SHARE / 2), 6)).toBeCloseTo(0.5)
    expect(worldFade(1, 6)).toBe(1)
    expect(worldFade(3, 6)).toBe(1)
  })

  it('es corto y nunca retrocede', () => {
    expect(FADE_SHARE).toBeLessThanOrEqual(0.4)
    const steps = Array.from({ length: 41 }, (_, step) => worldFade(at(5, step / 40), 6))
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
  })

  it('valida el avance y la cantidad de paradas', () => {
    expect(() => worldFade(Number.NaN, 6)).toThrow(RangeError)
    expect(() => worldFade(0.5, 0)).toThrow(RangeError)
  })
})
