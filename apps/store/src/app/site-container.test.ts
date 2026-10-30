import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { HOME_CONTAINER } from '@/features/home/home-styles'

/** Carpeta `apps/store/src`. */
const srcDir = dirname(dirname(fileURLToPath(import.meta.url)))

/** La hoja global de la tienda. */
const globals = readFileSync(join(srcDir, 'app', 'globals.css'), 'utf8')

/** Las declaraciones de la utilidad `@utility <name>` de `globals.css` (vacío si no está). */
function utility(name: string): string {
  const start = globals.indexOf(`@utility ${name} {`)
  if (start === -1) return ''
  return globals.slice(start, globals.indexOf('}', start))
}

/** Rutas (relativas a `src`) de los módulos de la tienda que no son pruebas. */
function sourceFiles(): string[] {
  return readdirSync(srcDir, { recursive: true, encoding: 'utf8' }).filter(
    (path) => /\.(ts|tsx)$/.test(path) && !/\.test\.tsx?$/.test(path),
  )
}

describe('site-container: el contenedor único de la tienda', () => {
  it('mide 1600 px como máximo, va centrado y tiene 20 a 64 px de margen lateral', () => {
    expect(globals).toContain('--site-max: 1600px;')
    expect(globals).toContain('--site-gutter: clamp(20px, 4vw, 64px);')
    const rule = utility('site-container')
    expect(rule).toContain('margin-inline: auto;')
    expect(rule).toContain('width: 100%;')
    expect(rule).toContain('max-width: var(--site-max);')
    expect(rule).toContain('padding-inline: var(--site-gutter);')
  })

  it('una pista de todo el ancho arranca donde arranca el contenido del contenedor', () => {
    expect(globals).toContain(
      '--site-inset: max(var(--site-gutter), calc((100% - var(--site-max)) / 2 + var(--site-gutter)));',
    )
  })

  it('el inicio usa el mismo contenedor', () => {
    expect(HOME_CONTAINER).toBe('site-container')
  })

  it('ningún módulo arma su propio contenedor: ni el viejo de 1280 px ni una copia del nuevo', () => {
    const offenders = sourceFiles().filter((path) => {
      const source = readFileSync(join(srcDir, path), 'utf8')
      return source.includes('max-w-[1280px]') || source.includes('max-w-[1600px]')
    })
    expect(offenders).toEqual([])
  })
})
