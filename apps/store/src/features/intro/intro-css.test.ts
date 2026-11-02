import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { EASE_MAIN, EASE_OPEN } from '../../components/motion/easing'
import { INTRO_TIMING } from './intro-state'

/** Las reglas de la intro, sin comentarios. */
const css = readFileSync(fileURLToPath(new URL('./intro.css', import.meta.url)), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

/** El cuerpo de un `@keyframes`. */
function keyframes(name: string): string {
  const match = new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`).exec(css)
  if (match?.[1] === undefined) throw new Error(`No está @keyframes ${name}.`)
  return match[1]
}

describe('apertura de la intro y del telón (Ruling MR-31)', () => {
  it('las dos mitades se abren con la curva de apertura, no con la general del sitio', () => {
    for (const side of ['left', 'right']) {
      expect(css).toMatch(
        new RegExp(
          `\\.intro\\[data-phase='opening'\\] \\.intro-half-${side} \\{\\s*animation: intro-open-${side} var\\(--intro-open-ms\\) var\\(--intro-ease-open\\) both;`,
        ),
      )
    }
  })

  it('la curva arranca suave, acelera y llega frenando: distinta de la general, que frena de más', () => {
    const [x1, y1, x2, y2] = EASE_OPEN
    expect(y1).toBe(0)
    expect(y2).toBe(1)
    expect(x1).toBeGreaterThanOrEqual(0.5)
    expect(x2).toBeLessThanOrEqual(0.5)
    expect(EASE_OPEN).not.toEqual(EASE_MAIN)
  })

  it('al abrirse solo se anima `transform`: sin desenfoque, que perdía cuadros al final', () => {
    for (const side of ['left', 'right']) {
      const body = keyframes(`intro-open-${side}`)
      expect(body).toMatch(/transform: translate3d\([-+]?135%, 0, 0\) rotateY\([-+]?18deg\);/)
      expect(body).not.toContain('filter')
      expect(body).not.toContain('blur')
    }
    expect(css).not.toContain('blur(')
  })

  it('las mitades pasan a su propia capa con el logo relleno o hecho, antes de abrirse', () => {
    expect(css).toMatch(
      /\.intro:is\(\[data-logo='fill'\], \[data-logo='done'\]\) \.intro-half \{\s*will-change: transform;/,
    )
  })

  it('la apertura de la intro dura 1,5 s', () => {
    expect(INTRO_TIMING.introOpenMs).toBe(1500)
  })
})
