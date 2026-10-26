import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KIT_ADVANCE_DELAY_MS, useKitStore } from './kit.store'

/** Estado actual del kit. */
function kit(): ReturnType<typeof useKitStore.getState> {
  return useKitStore.getState()
}

beforeEach(() => {
  vi.useFakeTimers()
  kit().reset()
  kit().setLeather('Negro')
})

afterEach(() => {
  kit().reset()
  vi.useRealTimers()
})

describe('useKitStore', () => {
  it('empieza en el paso Mate, sin piezas y con el cuero Negro', () => {
    expect(kit().step).toBe(0)
    expect(kit().picks).toEqual({})
    expect(kit().leather).toBe('Negro')
  })

  it('los pasos se recorren libremente, también el Resumen', () => {
    kit().goToStep(3)
    expect(kit().step).toBe(3)

    kit().goToStep(1)
    expect(kit().step).toBe(1)
  })

  it('rechaza un paso que no existe', () => {
    expect(() => {
      kit().goToStep(4)
    }).toThrow(RangeError)
    expect(() => {
      kit().goToStep(-1)
    }).toThrow(RangeError)
    expect(() => {
      kit().goToStep(1.5)
    }).toThrow(RangeError)
  })

  it('elegir una pieza la guarda enseguida pero avanza recién a los 420 ms', () => {
    kit().pickPiece('mate', 'm1')

    expect(kit().picks).toEqual({ mate: 'm1' })
    expect(kit().step).toBe(0)

    vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS - 1)
    expect(kit().step).toBe(0)

    vi.advanceTimersByTime(1)
    expect(kit().step).toBe(1)
  })

  it('el avance sale del paso donde se eligió y se detiene en el Resumen', () => {
    kit().goToStep(2)
    kit().pickPiece('yerba', 'y1')
    vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS)

    expect(kit().step).toBe(3)

    kit().pickPiece('yerba', 'y2')
    vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS)
    expect(kit().step).toBe(3)
  })

  it('cambiar de paso a mano antes de los 420 ms cancela el avance', () => {
    kit().pickPiece('mate', 'm1')
    kit().goToStep(3)
    vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS * 2)

    expect(kit().step).toBe(3)
  })

  it('elegir otra pieza antes de los 420 ms avanza una sola vez', () => {
    kit().pickPiece('mate', 'm1')
    vi.advanceTimersByTime(200)
    kit().pickPiece('mate', 'm2')
    vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS)

    expect(kit().picks.mate).toBe('m2')
    expect(kit().step).toBe(1)
  })

  it('Empezar de nuevo reinicia piezas y paso, pero no el cuero, y cancela el avance pendiente', () => {
    kit().setLeather('Borravino')
    kit().pickPiece('mate', 'm1')
    kit().reset()
    vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS)

    expect(kit().picks).toEqual({})
    expect(kit().step).toBe(0)
    expect(kit().leather).toBe('Borravino')
  })

  it('el mate del link se elige, conserva las otras piezas y abre en Bombilla', () => {
    kit().goToStep(2)
    kit().pickPiece('yerba', 'y1')
    vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS)
    kit().chooseMateFromLink('m2')

    expect(kit().picks).toEqual({ yerba: 'y1', mate: 'm2' })
    expect(kit().step).toBe(1)
  })

  it('valida el cuero, el grupo y el id de la pieza', () => {
    expect(() => {
      kit().setLeather('Azul')
    }).toThrow(RangeError)
    expect(() => {
      kit().pickPiece('termo' as 'mate', 'x')
    }).toThrow(RangeError)
    expect(() => {
      kit().pickPiece('mate', '  ')
    }).toThrow(RangeError)
    expect(() => {
      kit().chooseMateFromLink('')
    }).toThrow(RangeError)
  })
})
