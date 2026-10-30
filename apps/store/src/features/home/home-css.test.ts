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

describe('home.css: el Manifiesto clavado', () => {
  it('el link va en cobre claro solo en reposo: con mouse o foco el botón lo pone blanco (MR-16)', () => {
    // Sin la regla suelta: ganaría sobre el `hover:text-[#fff]` del botón (3,8:1 sobre el verde).
    expect(rule('.home-manifesto-cta')).toBe('')
    expect(rule('.home-manifesto-cta:not(:hover):not(:focus-visible)')).toContain(
      'color: var(--color-accent-300);',
    )
  })

  it('la frase clavada se achica con el alto de la ventana para que entre sobre la banda', () => {
    expect(rule('.home-pin .home-manifesto-phrase')).toContain(
      'font-size: clamp(30px, min(4.6vw, 7.2vh), 64px);',
    )
  })
})
