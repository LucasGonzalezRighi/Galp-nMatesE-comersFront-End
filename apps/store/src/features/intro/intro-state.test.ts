import { describe, expect, it } from 'vitest'
import type { IntroMode, IntroPhase, IntroState } from './intro-state'
import { canSkip, IDLE, introReducer } from './intro-state'

/** Un estado de la capa. */
function at(phase: IntroPhase, mode: IntroMode, href: string | null = null): IntroState {
  return { phase, mode, href }
}

describe('introReducer', () => {
  it('un clic en el menú baja el telón solo si no hay otra capa', () => {
    expect(introReducer(IDLE, { type: 'navigate', href: '/tienda' })).toEqual(
      at('covering', 'page', '/tienda'),
    )
    const covering = at('covering', 'page', '/tienda')
    expect(introReducer(covering, { type: 'navigate', href: '/kit' })).toBe(covering)
    const opening = at('opening', 'intro')
    expect(introReducer(opening, { type: 'navigate', href: '/kit' })).toBe(opening)
  })

  it('la intro arranca siempre (también sobre el telón): directo a dibujar si ya están los trazos', () => {
    expect(introReducer(IDLE, { type: 'introStart', ready: true })).toEqual(at('drawing', 'intro'))
    expect(introReducer(at('covering', 'page', '/'), { type: 'introStart', ready: false })).toEqual(
      at('loading', 'intro'),
    )
    expect(introReducer(at('loading', 'intro'), { type: 'ready' })).toEqual(at('drawing', 'intro'))
    const drawing = at('drawing', 'intro')
    expect(introReducer(drawing, { type: 'ready' })).toBe(drawing)
  })

  it('el cambio de ruta abre solo el telón que está tapando', () => {
    expect(introReducer(at('covering', 'page', '/tienda'), { type: 'routeChanged' })).toEqual(
      at('opening', 'page', '/tienda'),
    )
    // Si en el medio arrancó la intro del inicio, manda la intro.
    const drawing = at('drawing', 'intro')
    expect(introReducer(drawing, { type: 'routeChanged' })).toBe(drawing)
    expect(introReducer(IDLE, { type: 'routeChanged' })).toBe(IDLE)
  })

  it('la intro traza, rellena, se abre y termina; el telón se abre y termina', () => {
    const steps: IntroState[] = [at('drawing', 'intro')]
    for (let step = 0; step < 3; step += 1) {
      steps.push(introReducer(steps.at(-1) ?? IDLE, { type: 'next' }))
    }
    expect(steps.map((state) => state.phase)).toEqual(['drawing', 'filling', 'opening', 'idle'])
    expect(introReducer(at('opening', 'page', '/kit'), { type: 'next' })).toEqual(IDLE)
    // Cubriendo o cargando, el reloj no la mueve: espera la ruta nueva o los trazos.
    const covering = at('covering', 'page', '/kit')
    expect(introReducer(covering, { type: 'next' })).toBe(covering)
    const loading = at('loading', 'intro')
    expect(introReducer(loading, { type: 'next' })).toBe(loading)
  })

  it('saltar lleva a la apertura solo durante la carga, el trazado y el relleno de la intro', () => {
    for (const phase of ['loading', 'drawing', 'filling'] as const) {
      expect(canSkip(at(phase, 'intro'))).toBe(true)
      expect(introReducer(at(phase, 'intro'), { type: 'skip' })).toEqual(at('opening', 'intro'))
    }
    const covering = at('covering', 'page', '/kit')
    expect(canSkip(covering)).toBe(false)
    expect(introReducer(covering, { type: 'skip' })).toBe(covering)
    const opening = at('opening', 'intro')
    expect(introReducer(opening, { type: 'skip' })).toBe(opening)
  })

  it('al desmontarse el inicio la intro se va, salvo que ya se esté abriendo', () => {
    expect(introReducer(at('drawing', 'intro'), { type: 'introStop' })).toEqual(IDLE)
    const opening = at('opening', 'intro')
    expect(introReducer(opening, { type: 'introStop' })).toBe(opening)
    const covering = at('covering', 'page', '/kit')
    expect(introReducer(covering, { type: 'introStop' })).toBe(covering)
  })
})
