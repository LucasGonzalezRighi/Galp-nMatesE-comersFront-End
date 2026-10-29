import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** La hoja del inicio. */
const css = readFileSync(fileURLToPath(new URL('./home.css', import.meta.url)), 'utf8')

/** Las declaraciones de una regla de `home.css`, sin las llaves (vacío si no está). */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return ''
  return css.slice(start, css.indexOf('}', start))
}

describe('home.css: los fondos del mate 3D', () => {
  it('la foto de cada parada se ve nítida y apenas oscurecida: sin desenfoque ni agrandada', () => {
    const backdrop = rule('.home-backdrop')
    expect(backdrop).toContain('filter: brightness(0.85) saturate(0.95);')
    expect(backdrop).not.toContain('blur')
    expect(backdrop).not.toContain('scale')
  })
})
