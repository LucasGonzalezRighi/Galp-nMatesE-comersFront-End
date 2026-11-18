import { describe, expect, it } from 'vitest'
import type { StrokeStep } from './stroke-plan'
import { LOGO_PATHS } from './logo-paths'
import { planStrokes, STROKE_TIMING } from './stroke-plan'

describe('planStrokes', () => {
  const plan = planStrokes(LOGO_PATHS.mark, LOGO_PATHS.word)
  const markIds = new Set(LOGO_PATHS.mark.map((part) => part.id))

  /** El final del último trazo de una lista de pasos. */
  function lastEnd(steps: readonly StrokeStep[]): number {
    return Math.max(...steps.map((step) => step.delayMs + step.durationMs))
  }

  it('los pasos del matecito y después los de GALPÓN letra por letra, de izquierda a derecha', () => {
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

  it('el matecito y GALPÓN arrancan juntos: el matecito termina a 1,2 s y GALPÓN a 2,4 s (Ruling AI-1)', () => {
    expect(STROKE_TIMING.markMs).toBe(1200)
    expect(STROKE_TIMING.writeMs).toBe(2400)
    const byId = new Map(plan.map((step) => [step.id, step]))
    expect(byId.get('mark-mate')).toEqual({ id: 'mark-mate', delayMs: 0, durationMs: 1200 })
    expect(byId.get('g')?.delayMs).toBe(0)
    expect(lastEnd(plan.filter((step) => markIds.has(step.id)))).toBe(1200)
    expect(lastEnd(plan.filter((step) => !markIds.has(step.id)))).toBe(2400)
    expect(byId.get('n')?.delayMs).toBeGreaterThan(1200)
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
      planStrokes(LOGO_PATHS.mark, LOGO_PATHS.word, { markMs: 1200, writeMs: 300, letterMs: 460 }),
    ).toThrow(RangeError)
  })
})
