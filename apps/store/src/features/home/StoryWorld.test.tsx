// @vitest-environment jsdom

import type { MotionValue } from 'motion/react'
import { act, fireEvent, render } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
})

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

/** Los videos del mundo, en orden. */
function videos(): HTMLVideoElement[] {
  return Array.from(document.querySelectorAll('video'))
}

/** Simula un `HTMLMediaElement` con datos cargados: jsdom no reproduce video. */
function mockLoadedMedia(): {
  seek: ReturnType<typeof vi.fn<(this: HTMLMediaElement, value: number) => void>>
  play: ReturnType<typeof vi.fn<() => Promise<void>>>
  pause: ReturnType<typeof vi.fn<() => void>>
} {
  const seek = vi.fn<(this: HTMLMediaElement, value: number) => void>()
  const play = vi.fn<() => Promise<void>>(() => Promise.resolve())
  const pause = vi.fn<() => void>()
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
  return { seek, play, pause }
}

describe('StoryWorld', () => {
  it('dibuja un poster decorativo por parada, en el orden del relato', () => {
    render(<StoryWorld stops={POSTERS} progress={progress} />)
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
    render(<StoryWorld stops={POSTERS} progress={progress} />)
    expect(opacities()).toEqual([1, 0, 0, 0, 0, 0])
    expect(layers()[0]).toHaveAttribute('data-current', 'true')
    await moveTo(at(3, HOLD_SHARE / 2))
    expect(opacities()).toEqual([0, 0, 0, 1, 0, 0])
    expect(layers()[3]).toHaveAttribute('data-current', 'true')
    expect(layers().filter((layer) => layer.dataset.current === 'true')).toHaveLength(1)
  })

  it('durante el deslizamiento la siguiente aparece sobre la actual', async () => {
    render(<StoryWorld stops={POSTERS} progress={progress} />)
    await moveTo(at(1, HOLD_SHARE + (1 - HOLD_SHARE) * 0.3))
    const [, leaving = 0, arriving = 0, ...rest] = opacities()
    expect(leaving).toBe(1)
    expect(arriving).toBeGreaterThan(0)
    expect(arriving).toBeLessThan(1)
    expect(rest.every((opacity) => opacity === 0)).toBe(true)
  })

  it('sin clip no hay video: solo los posters, con la cámara que se mueve', () => {
    render(<StoryWorld stops={POSTERS} progress={progress} />)
    expect(videos()).toHaveLength(0)
    expect(document.querySelectorAll('.will-change-transform')).toHaveLength(6)
  })

  it('con clip, el video frota el avance y solo cargan la actual y sus vecinas', async () => {
    const { seek, play, pause } = mockLoadedMedia()
    render(<StoryWorld stops={CLIPS} progress={progress} />)
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

  it('con clip y menos movimiento no hay video', () => {
    mockReducedMotion(true)
    render(<StoryWorld stops={CLIPS} progress={progress} />)
    expect(videos()).toHaveLength(0)
    expect(document.querySelectorAll('img')).toHaveLength(6)
  })

  it('con clip y ahorro de datos no hay video', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    })
    try {
      render(<StoryWorld stops={CLIPS} progress={progress} />)
      expect(videos()).toHaveLength(0)
    } finally {
      Reflect.deleteProperty(navigator, 'connection')
    }
  })

  it('exige al menos una parada', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<StoryWorld stops={[]} progress={progress} />)).toThrow(RangeError)
  })
})
