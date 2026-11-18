import { describe, expect, it } from 'vitest'
import type { IntroMode, IntroPhase, IntroState } from './intro-state'
import { canSkip, IDLE, INTRO_TIMING, introReducer } from './intro-state'
import { STROKE_TIMING } from './stroke-plan'

/** Lo que el telón ya tiene: la página nueva pintada y el mínimo tapado cumplido. */
type CurtainFlags = Partial<Pick<IntroState, 'routed' | 'held'>>

/** Un estado de la capa. */
function at(
  phase: IntroPhase,
  mode: IntroMode,
  href: string | null = null,
  flags: CurtainFlags = {},
): IntroState {
  return { phase, mode, href, routed: false, held: false, ...flags }
}

describe('INTRO_TIMING', () => {
  it('la intro dura 4,4 s: trazado de 2,4 s, relleno de 0,5 s y apertura de 1,5 s (Ruling AI-1)', () => {
    expect(INTRO_TIMING.drawMs).toBe(Math.max(STROKE_TIMING.markMs, STROKE_TIMING.writeMs))
    expect(INTRO_TIMING.drawMs).toBe(2400)
    expect(INTRO_TIMING.fillMs).toBe(500)
    expect(INTRO_TIMING.introOpenMs).toBe(1500)
    expect(INTRO_TIMING.drawMs + INTRO_TIMING.fillMs + INTRO_TIMING.introOpenMs).toBe(4400)
  })

  it('el telón dura 1,5 s: baja en 450 ms, tapa hasta los 850 ms y abre en 650 ms (Ruling AI-2)', () => {
    expect(INTRO_TIMING.coverMs).toBe(450)
    expect(INTRO_TIMING.pageHoldMs).toBe(850)
    expect(INTRO_TIMING.pageOpenMs).toBe(650)
    expect(INTRO_TIMING.pageHoldMs + INTRO_TIMING.pageOpenMs).toBe(1500)
    expect(INTRO_TIMING.routeWaitMs).toBe(8000)
  })
})

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

  it('la intro dibujada arranca solo en la primera página: directo a dibujar si ya están los trazos', () => {
    expect(introReducer(IDLE, { type: 'introStart', ready: true, first: true })).toEqual(
      at('drawing', 'intro'),
    )
    expect(introReducer(IDLE, { type: 'introStart', ready: false, first: true })).toEqual(
      at('loading', 'intro'),
    )
    expect(introReducer(at('loading', 'intro'), { type: 'ready' })).toEqual(at('drawing', 'intro'))
    const drawing = at('drawing', 'intro')
    expect(introReducer(drawing, { type: 'ready' })).toBe(drawing)
  })

  it('al inicio desde adentro del sitio nunca hay intro: sigue el telón (Ruling AI-3)', () => {
    // Con el telón del menú bajando hacia el inicio, el inicio no lo cambia.
    const covering = at('covering', 'page', '/')
    expect(introReducer(covering, { type: 'introStart', ready: true, first: false })).toBe(covering)
    // Sin telón (el botón Atrás o un link fuera del menú), el telón aparece ya abajo, con la página
    // nueva pintada, y espera el mínimo tapado.
    expect(introReducer(IDLE, { type: 'introStart', ready: true, first: false })).toEqual(
      at('covered', 'page', null, { routed: true }),
    )
  })

  it('el telón se abre cuando pasó el mínimo tapado y ya pintó la página nueva, en cualquier orden', () => {
    // La página llega antes del mínimo: espera el reloj.
    const routed = introReducer(at('covering', 'page', '/tienda'), { type: 'routeChanged' })
    expect(routed).toEqual(at('covering', 'page', '/tienda', { routed: true }))
    expect(introReducer(routed, { type: 'next' })).toEqual(
      at('opening', 'page', '/tienda', { routed: true }),
    )
    // La página tarda más que el mínimo: se abre apenas llega.
    const held = introReducer(at('covering', 'page', '/kit'), { type: 'next' })
    expect(held).toEqual(at('covering', 'page', '/kit', { held: true }))
    expect(introReducer(held, { type: 'routeChanged' })).toEqual(
      at('opening', 'page', '/kit', { held: true }),
    )
    // El telón que apareció ya abajo, igual.
    const covered = at('covered', 'page', null, { routed: true })
    expect(introReducer(covered, { type: 'next' })).toEqual(
      at('opening', 'page', null, { routed: true }),
    )
    // Si la intro está tapando, el cambio de ruta no la toca; sin capa, tampoco.
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
    // Cargando, el reloj no la mueve: espera los trazos.
    const loading = at('loading', 'intro')
    expect(introReducer(loading, { type: 'next' })).toBe(loading)
  })

  it('saltar lleva a la apertura solo durante la carga, el trazado y el relleno de la intro', () => {
    for (const phase of ['loading', 'drawing', 'filling'] as const) {
      expect(canSkip(at(phase, 'intro'))).toBe(true)
      expect(introReducer(at(phase, 'intro'), { type: 'skip' })).toEqual(at('opening', 'intro'))
    }
    for (const curtain of [at('covering', 'page', '/kit'), at('covered', 'page')]) {
      expect(canSkip(curtain)).toBe(false)
      expect(introReducer(curtain, { type: 'skip' })).toBe(curtain)
    }
    const opening = at('opening', 'intro')
    expect(introReducer(opening, { type: 'skip' })).toBe(opening)
  })

  it('al desmontarse el inicio la intro se va, salvo que ya se esté abriendo', () => {
    expect(introReducer(at('drawing', 'intro'), { type: 'introStop' })).toEqual(IDLE)
    const opening = at('opening', 'intro')
    expect(introReducer(opening, { type: 'introStop' })).toBe(opening)
    const covering = at('covering', 'page', '/kit')
    expect(introReducer(covering, { type: 'introStop' })).toBe(covering)
    const covered = at('covered', 'page', null, { routed: true })
    expect(introReducer(covered, { type: 'introStop' })).toBe(covered)
  })
})
