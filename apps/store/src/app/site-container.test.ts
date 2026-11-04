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
  it('mide 1920 px como máximo, va centrado y tiene 20 a 96 px de margen lateral', () => {
    expect(globals).toContain('--site-max: 1920px;')
    expect(globals).toContain('--site-gutter: clamp(20px, 7.24vw - 8.2px, 96px);')
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
      return ['max-w-[1280px]', 'max-w-[1600px]', 'max-w-[1424px]'].some((copy) =>
        source.includes(copy),
      )
    })
    expect(offenders).toEqual([])
  })
})

describe('shop-container: el contenedor angosto de las grillas de tarjetas (Ruling AT-2)', () => {
  it('deja 1424 px de contenido (5 tarjetas de 268,8 px y 4 separaciones de 20 px)', () => {
    expect(globals).toContain('--shop-max: 1424px;')
    expect(5 * 268.8 + 4 * 20).toBeCloseTo(1424, 6)
  })

  it('va centrado y con el mismo margen lateral que site-container', () => {
    const rule = utility('shop-container')
    expect(rule).toContain('margin-inline: auto;')
    expect(rule).toContain('width: 100%;')
    expect(rule).toContain('max-width: calc(var(--shop-max) + 2 * var(--site-gutter));')
    expect(rule).toContain('padding-inline: var(--site-gutter);')
  })

  it('lo usan la tienda (título, barra y grilla) y los relacionados de la ficha', () => {
    const users = sourceFiles().filter((path) =>
      /className="[^"]*\bshop-container\b/.test(readFileSync(join(srcDir, path), 'utf8')),
    )
    expect(users.map((path) => path.replaceAll('\\', '/')).sort()).toEqual([
      'features/catalog/CatalogHero.tsx',
      'features/catalog/CatalogToolbar.tsx',
      'features/catalog/CatalogView.tsx',
      'features/product/RelatedProducts.tsx',
    ])
  })
})
