import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** La hoja del pie que sube. */
const css = readFileSync(fileURLToPath(new URL('./footer.css', import.meta.url)), 'utf8')

describe('footer.css: el pie que sube por encima de las reseñas', () => {
  it('solo aplica en escritorio, con movimiento y en la página con la sección marcada', () => {
    expect(css).toMatch(
      /@media \(min-width: 1024px\) and \(prefers-reduced-motion: no-preference\)\s*\{\s*body:has\(\[data-footer-curtain\]\) \.site-footer \{/,
    )
    expect(css.match(/\.site-footer/g)).toHaveLength(1)
  })

  it('sube una pantalla por encima, la cubre entera y con fondo opaco', () => {
    for (const declaration of [
      'position: relative;',
      'z-index: 20;',
      'min-height: 100svh;',
      'margin-top: -100svh;',
      'background: var(--color-background);',
    ]) {
      expect(css).toContain(declaration)
    }
  })

  it('el borde de arriba se ve mientras sube: una línea fina y una sombra sobre las reseñas', () => {
    expect(css).toContain(
      'border-top: 1px solid color-mix(in srgb, var(--color-foreground) 12%, transparent);',
    )
    expect(css).toMatch(/box-shadow: 0 -\d+px \d+px -\d+px rgb\(0 0 0 \/ 0\.\d+\);/)
  })
})
