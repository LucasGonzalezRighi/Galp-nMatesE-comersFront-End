import { describe, expect, it } from 'vitest'
import { LOGO_PATHS } from './logo-paths'
import { planStrokes, STROKE_TIMING } from './stroke-plan'

describe('planStrokes', () => {
  const plan = planStrokes(LOGO_PATHS.mark, LOGO_PATHS.word)

  it('dibuja primero el matecito y después GALPÓN letra por letra, de izquierda a derecha', () => {
    expect(plan.map((step) => step.id)).toEqual([
      'mark-mate',
      'mark-mouth',
      'g',
      'a',
      'l',
      'p',
      'p-hole',
      'o-mate',
      'o-mouth',
      'n',
    ])
  })

  it('el matecito ocupa el primer tramo y la palabra termina justo al cerrar el dibujo', () => {
    const byId = new Map(plan.map((step) => [step.id, step]))
    expect(byId.get('mark-mate')).toEqual({ id: 'mark-mate', delayMs: 0, durationMs: 1400 })
    expect(byId.get('g')?.delayMs).toBe(STROKE_TIMING.markMs)
    const ends = plan.map((step) => step.delayMs + step.durationMs)
    expect(Math.max(...ends)).toBe(STROKE_TIMING.markMs + STROKE_TIMING.writeMs)
  })

  it('cada letra se solapa un poco con la siguiente y los huecos van con su letra', () => {
    const letters = plan.filter((step) => ['g', 'a', 'l', 'p', 'o-mate', 'n'].includes(step.id))
    for (const [index, letter] of letters.slice(1).entries()) {
      const previous = letters[index]
      expect(previous).toBeDefined()
      if (previous === undefined) continue
      expect(letter.delayMs).toBeLessThan(previous.delayMs + previous.durationMs)
      expect(letter.delayMs).toBeGreaterThan(previous.delayMs)
    }
    const p = plan.find((step) => step.id === 'p')
    const hole = plan.find((step) => step.id === 'p-hole')
    expect(hole?.delayMs).toBeGreaterThan(p?.delayMs ?? Infinity)
    expect((hole?.delayMs ?? 0) + (hole?.durationMs ?? 0)).toBeLessThanOrEqual(
      (p?.delayMs ?? 0) + (p?.durationMs ?? 0),
    )
  })

  it('rechaza piezas vacías, un hueco sin letra y tiempos imposibles', () => {
    expect(() => planStrokes([], LOGO_PATHS.word)).toThrow(RangeError)
    expect(() => planStrokes(LOGO_PATHS.mark, [{ id: 'x', minX: 0, hole: true }])).toThrow(
      RangeError,
    )
    expect(() =>
      planStrokes(LOGO_PATHS.mark, [{ id: 'x', minX: Number.NaN, hole: false }]),
    ).toThrow(RangeError)
    expect(() =>
      planStrokes(LOGO_PATHS.mark, LOGO_PATHS.word, { markMs: 1400, writeMs: 300, letterMs: 380 }),
    ).toThrow(RangeError)
  })
})
