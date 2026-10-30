import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** La hoja del pie que sube. */
const css = readFileSync(fileURLToPath(new URL('./footer.css', import.meta.url)), 'utf8')

/** Las reglas del pie que sube: lo que hay adentro del `@media` de escritorio con movimiento. */
const rising = css.slice(
  css.indexOf('@media (min-width: 1024px) and (prefers-reduced-motion: no-preference)'),
)

describe('footer.css: el pie que sube por encima de las reseñas quietas', () => {
  it('solo aplica en escritorio, con movimiento y con la marca que el inicio pone en <html>', () => {
    expect(rising).toMatch(
      /^@media \(min-width: 1024px\) and \(prefers-reduced-motion: no-preference\)\s*\{\s*:root\[data-footer-rise\] \.site-footer \{/,
    )
    // Fuera del `@media` el pie no sube: no hay margen negativo para las demás páginas.
    expect(css.slice(0, css.length - rising.length)).not.toContain('margin-top')
  })

  it('no depende del DOM del inicio (con Cache Components queda oculto en el documento, Ruling MR-27)', () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(rules).not.toContain(':has(')
    expect(rules).not.toContain('data-footer-stage')
  })

  it('sube su propio alto por encima, como el del portafolio', () => {
    for (const declaration of [
      '--footer-edge: clamp(16px, 2.6vw, 36px);',
      'position: relative;',
      'z-index: 20;',
      'margin-top: calc(-1 * var(--footer-h, 0px));',
    ]) {
      expect(rising).toContain(declaration)
    }
  })

  it('el borde de arriba va en diagonal y la línea fina lo sigue', () => {
    expect(rising.replace(/\s+/g, ' ')).toContain(
      'clip-path: polygon( 0 calc(var(--footer-edge) + 1.92vw - 1px), 100% calc(var(--footer-edge) - 1.92vw - 1px), 100% 100%, 0 100% );',
    )
    expect(rising).toMatch(/:root\[data-footer-rise\] \.site-footer-line \{\s*display: block;/)
    // Fuera del pie que sube, la línea no se ve.
    expect(css).toMatch(/\.site-footer-line \{\s*display: none;/)
  })

  it('es vidrio esmerilado: las reseñas se ven borrosas a través', () => {
    expect(rising).toContain(
      'background: color-mix(in srgb, var(--color-background) 78%, transparent);',
    )
    expect(rising).toContain('backdrop-filter: blur(16px) saturate(120%);')
    expect(rising).toContain('-webkit-backdrop-filter: blur(16px) saturate(120%);')
  })

  it('ya no es la cortina de una pantalla con borde y sombra', () => {
    expect(css).not.toContain('100svh')
    expect(css).not.toContain('data-footer-curtain')
    expect(css).not.toContain('border-top')
    expect(css).not.toContain('box-shadow')
  })
})

describe('footer.css: el pie sutil de las demás páginas (Ruling MR-28)', () => {
  /** Las reglas que solo valen fuera del inicio. */
  const quiet = css.slice(css.indexOf(':root:not([data-footer-home])'), css.indexOf('@media (min'))

  it('GALPÓN con el degradé apagado, más tenue que en el inicio', () => {
    expect(quiet).toMatch(
      /:root:not\(\[data-footer-home\]\) \.site-footer \[data-wordmark\] \{\s*opacity: 0\.45;/,
    )
  })

  it('sus filas entran con un fundido suave al llegar a la pantalla, solo con movimiento', () => {
    const fade = css.slice(css.indexOf('@media (prefers-reduced-motion: no-preference)'))
    expect(fade).toMatch(/@supports \(animation-timeline: view\(\)\)/)
    expect(fade).toMatch(
      /:root:not\(\[data-footer-home\]\) \.site-footer \[data-footer-row\] \{\s*animation: footer-row-in linear both;\s*animation-timeline: view\(\);/,
    )
    expect(css).toMatch(/@keyframes footer-row-in \{\s*from \{\s*opacity: 0;/)
  })
})
