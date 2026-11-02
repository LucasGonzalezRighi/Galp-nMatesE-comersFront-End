// @vitest-environment jsdom

import type { MotionValue } from 'motion/react'
import { act, renderHook } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanUpAfterEach } from './test/support'
import { scrollDirectionAt, useScrollDirection } from './use-scroll-direction'

/** El scroll de la ventana, que cada prueba mueve a mano (jsdom no hace scroll). */
const scroll = vi.hoisted((): { y: unknown } => ({ y: null }))

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useScroll: (): { scrollY: unknown } => ({ scrollY: scroll.y }),
}))

cleanUpAfterEach()

let scrollY: MotionValue<number>

beforeEach(() => {
  scrollY = motionValue(0)
  scroll.y = scrollY
})

/** Mueve el scroll a `y` píxeles. */
function scrollTo(y: number): void {
  act(() => {
    scrollY.set(y)
  })
}

describe('scrollDirectionAt', () => {
  it('arriba de todo (hasta el umbral) siempre es "up"', () => {
    expect(scrollDirectionAt(0, 80, 80, 'down')).toBe('up')
    expect(scrollDirectionAt(80, 40, 80, 'down')).toBe('up')
  })

  it('pasado el umbral, bajar es "down" y subir es "up"; quieto conserva la anterior', () => {
    expect(scrollDirectionAt(80, 81, 80, 'up')).toBe('down')
    expect(scrollDirectionAt(500, 499, 80, 'down')).toBe('up')
    expect(scrollDirectionAt(500, 500, 80, 'down')).toBe('down')
    expect(scrollDirectionAt(500, 500, 80, 'up')).toBe('up')
  })

  it('rechaza posiciones o umbrales no válidos', () => {
    expect(() => scrollDirectionAt(Number.NaN, 0, 80, 'up')).toThrow(RangeError)
    expect(() => scrollDirectionAt(0, Number.POSITIVE_INFINITY, 80, 'up')).toThrow(RangeError)
    expect(() => scrollDirectionAt(0, 10, -1, 'up')).toThrow(RangeError)
  })
})

describe('useScrollDirection', () => {
  it('empieza en "up" y pasa a "down" al bajar más que el umbral', () => {
    const { result } = renderHook(() => useScrollDirection(80))
    expect(result.current).toBe('up')

    scrollTo(60)
    expect(result.current).toBe('up')

    scrollTo(200)
    expect(result.current).toBe('down')
  })

  it('vuelve a "up" apenas se sube y también al llegar arriba', () => {
    const { result } = renderHook(() => useScrollDirection(80))
    scrollTo(400)
    expect(result.current).toBe('down')

    scrollTo(380)
    expect(result.current).toBe('up')

    scrollTo(600)
    expect(result.current).toBe('down')
    scrollTo(0)
    expect(result.current).toBe('up')
  })

  it('rechaza un umbral negativo', () => {
    expect(() => renderHook(() => useScrollDirection(-5))).toThrow(RangeError)
  })
})
