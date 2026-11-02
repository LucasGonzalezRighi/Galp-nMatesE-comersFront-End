import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const motionDir = dirname(fileURLToPath(import.meta.url))

/** Código fuente de un módulo de `components/motion` (`.ts` o `.tsx`). */
function sourceOf(name: string): string {
  for (const extension of ['.ts', '.tsx']) {
    try {
      return readFileSync(join(motionDir, `${name}${extension}`), 'utf8')
    } catch {
      // Prueba con la otra extensión.
    }
  }
  throw new Error(`No existe el módulo ./${name}`)
}

/** `true` si el módulo empieza con la directiva `'use client'`. */
function isClientModule(source: string): boolean {
  return /^\s*(?:\/\*[\s\S]*?\*\/\s*)?['"]use client['"]/.test(source)
}

/** Nombres de los módulos locales (`./x`) que importa o reexporta un módulo. */
function localImportsOf(source: string): string[] {
  return Array.from(source.matchAll(/from\s+'\.\/([^']+)'/g), (match) => match[1] ?? '')
}

/** Módulos a los que llega un Server Component desde el barrel sin cruzar un `'use client'`. */
function serverGraphFromBarrel(): string[] {
  const seen = new Set<string>()
  const pending = ['index']
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    if (seen.has(name)) continue
    const source = sourceOf(name)
    if (name !== 'index' && isClientModule(source)) continue
    seen.add(name)
    pending.push(...localImportsOf(source))
  }
  return Array.from(seen)
}

describe('límite entre servidor y cliente de components/motion', () => {
  it('ningún módulo que se importa desde un Server Component usa React ni Motion', () => {
    // `useSyncExternalStore`, `useEffect` o `m` en el grafo del servidor hacen fallar `next build`.
    const clientApi = /import\s+(?!type\b)[^']*?from\s+'(?:react|motion\/react)'/

    const offenders = serverGraphFromBarrel().filter((name) => clientApi.test(sourceOf(name)))

    expect(offenders).toEqual([])
  })

  it('los hooks reexportados por el barrel son módulos de cliente', () => {
    for (const name of [
      'use-prefers-reduced-motion',
      'use-scroll-top-on-step',
      'use-reveal-disabled',
      'use-replay-count',
    ]) {
      expect(isClientModule(sourceOf(name)), name).toBe(true)
    }
  })
})
