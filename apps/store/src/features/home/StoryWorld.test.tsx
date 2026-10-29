// @vitest-environment jsdom

import type { RenderResult } from '@testing-library/react'
import type { MotionValue } from 'motion/react'
import { act, fireEvent, render } from '@testing-library/react'
import { domAnimation, LazyMotion, motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoryWorldStop } from './StoryWorld'
import type { WorldMedia } from './world-media'
import { cleanUpAfterEach, mockReducedMotion } from '../../components/motion/test/support'
import { HOLD_SHARE } from './stage-layout'
import { StoryWorld } from './StoryWorld'
import { WORLD_MEDIA, WORLD_ORDER } from './world-media'

cleanUpAfterEach()

/** Las seis paradas del mundo con sus posters, sin clips (como hoy). */
const POSTERS = WORLD_ORDER.map((key) => ({ key, media: WORLD_MEDIA[key] }))

/** Las mismas paradas con un clip cada una, como cuando lleguen los `.mp4`. */
const CLIPS = WORLD_ORDER.map((key) => ({
  key,
  media: { ...WORLD_MEDIA[key], clip: `/hero/world/${key}.mp4` } satisfies WorldMedia,
}))

let progress: MotionValue<number>

beforeEach(() => {
  progress = motionValue(0)
  mockReducedMotion(false)
  // jsdom no dibuja en un lienzo: las hojas de yerba se montan sin pintar.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

/** Dibuja el mundo como lo monta el paseo: el `ScrollStage` carga las funciones de Motion. */
function renderWorld(stops: readonly StoryWorldStop[]): RenderResult {
  return render(
    <LazyMotion features={domAnimation}>
      <StoryWorld stops={stops} progress={progress} />
    </LazyMotion>,
  )
}

/** Mueve el avance y espera un cuadro, para que Motion escriba los estilos. */
async function moveTo(value: number): Promise<void> {
  await act(async () => {
    progress.set(value)
    await new Promise((resolve) => setTimeout(resolve, 40))
  })
}

/** Avance del scroll en la parada `stop` (de 6), con `share` del tramo recorrido. */
function at(stop: number, share: number): number {
  return (stop + share) / 6
}

/** Las capas del mundo, en orden. */
function layers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-world-stop]'))
}

/** La opacidad de cada capa, como número. */
function opacities(): number[] {
  return layers().map((layer) => Number(layer.style.opacity))
}

/** El marco de la cámara de la capa `index` (el que se mueve sobre el cuadro). */
function frame(index: number): HTMLElement {
  const element = layers()[index]?.firstElementChild
  if (!(element instanceof HTMLElement)) throw new Error(`La capa ${String(index)} no tiene marco.`)
  return element
}

/** La escala de la cámara de la capa `index` (1 si no lleva). */
function scaleOf(index: number): number {
  return Number(/scale\(([\d.]+)\)/.exec(frame(index).style.transform)?.[1] ?? 1)
}

/** La deriva de la cámara de la capa `index`, en vw (0 si no lleva). */
function driftOf(index: number): number {
  return Number(/translateX\((-?[\d.]+)vw\)/.exec(frame(index).style.transform)?.[1] ?? 0)
}

/** Lo que se mueve en cada capa (`clave:hojas` o `clave:vapor`), en orden. */
function life(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-world-life]')).map(
    (element) =>
      `${element.closest<HTMLElement>('[data-world-stop]')?.dataset.worldStop ?? '?'}:${element.dataset.worldLife ?? '?'}`,
  )
}

/** Los videos del mundo, en orden. */
function videos(): HTMLVideoElement[] {
  return Array.from(document.querySelectorAll('video'))
}

/** Simula un `HTMLMediaElement` con datos cargados: jsdom no reproduce video. */
function mockLoadedMedia(): {
  seek: ReturnType<typeof vi.fn<(this: HTMLMediaElement, value: number) => void>>
  play: ReturnType<typeof vi.fn<() => Promise<void>>>
  pause: ReturnType<typeof vi.fn<() => void>>
  load: ReturnType<typeof vi.fn<() => void>>
} {
  const seek = vi.fn<(this: HTMLMediaElement, value: number) => void>()
  const play = vi.fn<() => Promise<void>>(() => Promise.resolve())
  const pause = vi.fn<() => void>()
  const load = vi.fn<() => void>()
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
  vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(10)
  vi.spyOn(HTMLMediaElement.prototype, 'currentTime', 'set').mockImplementation(function (
    this: HTMLMediaElement,
    value: number,
  ) {
    seek.call(this, value)
  })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(load)
  return { seek, play, pause, load }
}

describe('StoryWorld', () => {
  it('dibuja un poster decorativo por parada, en el orden del relato', () => {
    renderWorld(POSTERS)
    expect(layers().map((layer) => layer.dataset.worldStop)).toEqual([...WORLD_ORDER])
    const images = Array.from(document.querySelectorAll('img'))
    expect(images).toHaveLength(6)
    expect(images.every((image) => image.getAttribute('alt') === '')).toBe(true)
    expect(images.every((image) => image.closest('[aria-hidden="true"]') !== null)).toBe(true)
    expect(decodeURIComponent(images[0]?.getAttribute('src') ?? '')).toContain(
      '/hero/world/yerba.jpg',
    )
    // Solo la primera carga con prioridad; las demás esperan.
    expect(images[0]).not.toHaveAttribute('loading', 'lazy')
    expect(images.slice(1).every((image) => image.getAttribute('loading') === 'lazy')).toBe(true)
  })

  it('la parada actual se ve y las demás tienen opacidad 0', async () => {
    renderWorld(POSTERS)
    expect(opacities()).toEqual([1, 0, 0, 0, 0, 0])
    expect(layers()[0]).toHaveAttribute('data-current', 'true')
    await moveTo(at(3, HOLD_SHARE / 2))
    expect(opacities()).toEqual([0, 0, 0, 1, 0, 0])
    expect(layers()[3]).toHaveAttribute('data-current', 'true')
    expect(layers().filter((layer) => layer.dataset.current === 'true')).toHaveLength(1)
  })

  it('durante el deslizamiento la siguiente aparece sobre la actual', async () => {
    renderWorld(POSTERS)
    await moveTo(at(1, HOLD_SHARE + (1 - HOLD_SHARE) * 0.3))
    const [, leaving = 0, arriving = 0, ...rest] = opacities()
    expect(leaving).toBe(1)
    expect(arriving).toBeGreaterThan(0)
    expect(arriving).toBeLessThan(1)
    expect(rest.every((opacity) => opacity === 0)).toBe(true)
  })

  it('sin clip no hay video: solo los posters, con la cámara que avanza a lo largo del tramo', async () => {
    renderWorld(POSTERS)
    expect(videos()).toHaveLength(0)
    expect(
      layers().every((_, index) => frame(index).classList.contains('will-change-transform')),
    ).toBe(true)
    await moveTo(at(3, 0))
    const start = { scale: scaleOf(3), drift: driftOf(3) }
    await moveTo(at(3, 0.5))
    const middle = { scale: scaleOf(3), drift: driftOf(3) }
    await moveTo(at(3, 0.9))
    const late = { scale: scaleOf(3), drift: driftOf(3) }
    // Se acerca de 1 a 1,06 y deriva de −1,5vw a 1,5vw, siempre hacia adelante.
    expect(start).toEqual({ scale: 1, drift: -1.5 })
    expect(middle.scale).toBeCloseTo(1.03)
    expect(middle.drift).toBeCloseTo(0)
    expect(late.scale).toBeGreaterThan(middle.scale)
    expect(late.drift).toBeGreaterThan(middle.drift)
    expect(late.scale).toBeLessThanOrEqual(1.06)
  })

  it('cada poster lleva su encuadre: el mate anclado a la izquierda y acercado', () => {
    renderWorld(POSTERS)
    const images = Array.from(document.querySelectorAll('img'))
    const pieces = images[WORLD_ORDER.indexOf('pieces')]
    expect(pieces?.style.objectPosition).toBe('0% 50%')
    expect(pieces?.style.transform).toBe('scale(1.15)')
    expect(images[0]?.style.objectPosition).toBe('50% 50%')
    expect(images[0]?.style.transform).toBe('')
  })

  it('del mate a la bombilla la cámara entra por la boca del mate', async () => {
    renderWorld(POSTERS)
    const pieces = WORLD_ORDER.indexOf('pieces')
    const bombilla = WORLD_ORDER.indexOf('bombilla')
    // A mitad del deslizamiento del mate a la bombilla.
    await moveTo(at(pieces, HOLD_SHARE + (1 - HOLD_SHARE) / 2))
    expect(frame(pieces).style.transformOrigin).toBe('61% 27%')
    expect(frame(bombilla).style.transformOrigin).toBe('50% 44%')
    // La cámara leve (≈ 1,05) por la mitad de la zambullida (√2,2 ≈ 1,48).
    expect(scaleOf(pieces)).toBeGreaterThan(1.5)
    // La boca del mate ya está donde está la de la bombilla (11 % a la izquierda por 1,03 y 17 % abajo).
    expect(layers()[pieces]?.style.transform).toBe('translateX(-11.3%) translateY(17%)')
    expect(layers()[bombilla]?.style.transform ?? '').toBe('')
    // La bombilla llega desde lejos (√0,92 ≈ 0,96) y termina en 1 al quedar quieta.
    expect(scaleOf(bombilla)).toBeCloseTo(Math.sqrt(0.92), 2)
    await moveTo(at(bombilla, 0))
    expect(scaleOf(bombilla)).toBe(1)
    // En los demás deslizamientos, solo la cámara leve alrededor del centro.
    await moveTo(at(0, HOLD_SHARE + (1 - HOLD_SHARE) / 2))
    expect(scaleOf(0)).toBeLessThanOrEqual(1.06)
    expect(scaleOf(1)).toBe(1)
    expect(frame(0).style.transformOrigin).toBe('')
  })

  it('las hojas caen solo en la parada del mate y el vapor sube en el ritual y la ronda', async () => {
    renderWorld(POSTERS)
    expect(life()).toEqual([])
    await moveTo(at(2, 0.2))
    expect(life()).toEqual(['pieces:leaves'])
    expect(document.querySelector('[data-world-life="leaves"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    await moveTo(at(3, 0.2))
    expect(life()).toEqual([])
    await moveTo(at(4, 0.2))
    expect(life()).toEqual(['ritual:steam'])
    await moveTo(at(5, 0.2))
    expect(life()).toEqual(['leather:steam'])
  })

  it('con menos movimiento no caen hojas ni sube vapor', async () => {
    mockReducedMotion(true)
    renderWorld(POSTERS)
    for (const stop of [2, 4, 5]) {
      await moveTo(at(stop, 0.2))
      expect(life()).toEqual([])
    }
  })

  it('al final del tramo de la ronda el mundo se funde a negro', async () => {
    renderWorld(POSTERS)
    const fade = (): number =>
      Number(document.querySelector<HTMLElement>('[data-world-fade]')?.style.opacity)
    expect(fade()).toBe(0)
    await moveTo(at(5, 0.3))
    expect(fade()).toBe(0)
    await moveTo(1)
    expect(fade()).toBe(1)
  })

  it('con clip, el video frota el avance y solo cargan la actual y sus vecinas', async () => {
    const { seek, play, pause } = mockLoadedMedia()
    renderWorld(CLIPS)
    await moveTo(at(2, 0.5))
    const all = videos()
    expect(all).toHaveLength(6)
    expect(all.map((video) => video.getAttribute('src'))).toEqual([
      null,
      '/hero/world/gourd.mp4',
      '/hero/world/pieces.mp4',
      '/hero/world/bombilla.mp4',
      null,
      null,
    ])
    expect(all.map((video) => video.getAttribute('preload'))).toEqual([
      'none',
      'auto',
      'auto',
      'auto',
      'none',
      'none',
    ])
    expect(all.every((video) => video.muted && video.hasAttribute('playsinline'))).toBe(true)
    expect(all[2]).toHaveAttribute('poster', '/hero/world/pieces.jpg')
    // El clip de la parada actual va por la mitad de su tramo.
    const current = all[2]
    const seeks = seek.mock.calls.filter((_, call) => seek.mock.contexts[call] === current)
    expect(seeks.at(-1)?.[0]).toBeCloseTo(5)
    // Las que no cargan no se tocan.
    expect(seek.mock.contexts.some((video) => video === all[0] || video === all[5])).toBe(false)
    // Al cargar, una reproducción silenciosa y pausa (iOS no pinta los cuadros buscados sin eso).
    await act(async () => {
      if (current !== undefined) fireEvent.loadedData(current)
      await Promise.resolve()
    })
    expect(play).toHaveBeenCalled()
    expect(pause).toHaveBeenCalled()
  })

  it('las capas que se alejan sueltan su clip', async () => {
    const { load } = mockLoadedMedia()
    renderWorld(CLIPS)
    await moveTo(at(2, 0.5))
    const all = videos()
    load.mockClear()
    await moveTo(at(5, 0.5))
    expect(all.map((video) => video.getAttribute('src'))).toEqual([
      null,
      null,
      null,
      null,
      '/hero/world/ritual.mp4',
      '/hero/world/leather.mp4',
    ])
    // Las tres que estaban cerca vuelven a cargar sin `src`, así el navegador suelta el clip.
    expect(load.mock.contexts).toHaveLength(3)
    for (const index of [1, 2, 3]) expect(load.mock.contexts).toContain(all[index])
  })

  it('con clip y menos movimiento no hay video', () => {
    mockReducedMotion(true)
    renderWorld(CLIPS)
    expect(videos()).toHaveLength(0)
    expect(document.querySelectorAll('img')).toHaveLength(6)
  })

  it('con clip y ahorro de datos no hay video', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    })
    try {
      renderWorld(CLIPS)
      expect(videos()).toHaveLength(0)
    } finally {
      Reflect.deleteProperty(navigator, 'connection')
    }
  })

  it('exige al menos una parada', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderWorld([])).toThrow(RangeError)
  })
})
