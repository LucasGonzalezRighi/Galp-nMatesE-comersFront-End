import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cssVariables, tokens } from './tokens'

/** Lee un archivo CSS del paquete como texto. */
function readCss(name: string): string {
  return readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
}

/** Extrae las declaraciones `--nombre: valor;` de un CSS, sin comentarios. */
function declarations(css: string): Map<string, string> {
  const result = new Map<string, string>()
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of clean.matchAll(/(--[\w*-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match
    if (name !== undefined && value !== undefined) result.set(name, value.trim())
  }
  return result
}

describe('tokens.css', () => {
  const css = declarations(readCss('tokens.css'))

  it('cada variable de cssVariables() está en el CSS con el mismo valor', () => {
    for (const [name, value] of Object.entries(cssVariables())) {
      expect(css.get(name), name).toBe(value)
    }
  })

  it('el CSS no declara variables que cssVariables() no conozca', () => {
    const known = new Set(Object.keys(cssVariables()))
    const extra = [...css.keys()].filter((name) => name !== '--color-*' && !known.has(name))
    expect(extra).toEqual([])
  })

  it('arranca borrando la paleta de colores por defecto de Tailwind', () => {
    expect([...css.keys()][0]).toBe('--color-*')
    expect(css.get('--color-*')).toBe('initial')
  })

  it('declara los valores puntuales del diseño', () => {
    expect(css.get('--color-background')).toBe('#1a1210')
    expect(css.get('--color-accent-500')).toBe('#c0803f')
    expect(css.get('--color-accent-2-500')).toBe('#8ba43f')
    expect(css.get('--radius-lg')).toBe('14px')
    expect(css.get('--ease-spring')).toBe('cubic-bezier(.34,1.56,.64,1)')
  })

  it('el color sin número es el 500 de su escala', () => {
    expect(css.get('--color-accent')).toBe(css.get('--color-accent-500'))
  })
})

describe('base.css', () => {
  const css = declarations(readCss('base.css'))

  it('declara los espacios del diseño con los mismos valores que tokens.space', () => {
    for (const [step, value] of Object.entries(tokens.space)) {
      expect(css.get(`--space-${step}`), step).toBe(value)
    }
  })

  it('trae una fuente por defecto para las apps que no usan next/font', () => {
    expect(css.get('--font-inter')).toBe("'Inter Variable'")
  })
})

describe('tokens', () => {
  it('los cueros de la interfaz y los del 3D son dos paletas distintas', () => {
    expect(tokens.leathersUi.Borravino).toBe('#5d1f2d')
    expect(tokens.leathers3d.Crudo).toBe('#b88d5c')
    expect(tokens.leathersUi).not.toEqual(tokens.leathers3d)
  })

  it('la duración por defecto de la entrada es de 1000 ms', () => {
    expect(tokens.durations.reveal).toBe(1000)
  })
})
