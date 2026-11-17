import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pruneRouteCache, routeCacheEntryKey, startRouteCacheLimit } from './route-cache-limit'

/** Un kB, para armar páginas de tamaño conocido. */
const KB = 1024

/** Carpeta de una ruta dentro de la caché, como las arma Next (`APP_PAGE/<hash>/$`). */
const PRODUCT_ROUTE = join('APP_PAGE', 'a'.repeat(64), '$', 'producto')

let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'galpon-route-cache-'))
})

afterEach(async () => {
  vi.useRealTimers()
  await rm(directory, { recursive: true, force: true })
})

/**
 * Guarda una página como lo hace Next: `.html`, `.meta`, `.rsc` y la carpeta `.segments`, con la
 * fecha de modificación corrida `ageSeconds` hacia atrás.
 *
 * @returns Los bytes que ocupa la página.
 */
async function writePage(slug: string, sizeKb: number, ageSeconds: number): Promise<number> {
  const base = join(directory, PRODUCT_ROUTE, slug)
  const segments = `${base}.segments`
  await mkdir(join(segments, 'interno'), { recursive: true })
  const files: [string, number][] = [
    [`${base}.html`, sizeKb * KB],
    [`${base}.meta`, 100],
    [`${base}.rsc`, 2 * KB],
    [join(segments, '_tree.segment.rsc'), KB],
    [join(segments, 'interno', '__PAGE__.segment.rsc'), KB],
  ]
  const when = new Date(Date.now() - ageSeconds * 1000)
  for (const [path, bytes] of files) {
    await writeFile(path, 'x'.repeat(bytes))
    await utimes(path, when, when)
  }
  return files.reduce((total, [, bytes]) => total + bytes, 0)
}

/** Los slugs que siguen guardados (por su `.html`), ordenados. */
async function storedSlugs(): Promise<string[]> {
  const names = await readdir(join(directory, PRODUCT_ROUTE))
  return names
    .filter((name) => name.endsWith('.html'))
    .map((name) => name.slice(0, -'.html'.length))
    .sort()
}

describe('routeCacheEntryKey', () => {
  it('junta en una misma página el html, el meta, el rsc y lo que cuelga de .segments', () => {
    const base = 'APP_PAGE/abc/$/producto/mate-imperial'
    for (const suffix of [
      '.html',
      '.meta',
      '.rsc',
      '.prefetch.rsc',
      '.segments/_tree.segment.rsc',
      '.segments/!KHRpZW5kYSk/producto/__PAGE__.segment.rsc',
    ]) {
      expect(routeCacheEntryKey(`${base}${suffix}`), suffix).toBe(base)
    }
  })

  it('distingue dos páginas y acepta las barras de Windows', () => {
    expect(routeCacheEntryKey('APP_PAGE\\abc\\$\\producto\\otro.segments\\_full.segment.rsc')).toBe(
      'APP_PAGE/abc/$/producto/otro',
    )
    expect(routeCacheEntryKey('APP_ROUTE/abc/$/sitemap.xml.body')).toBe(
      'APP_ROUTE/abc/$/sitemap.xml',
    )
  })

  it('un archivo que no es de una página es su propia entrada', () => {
    expect(routeCacheEntryKey('APP_PAGE/abc/$/suelto.txt')).toBe('APP_PAGE/abc/$/suelto.txt')
  })
})

describe('pruneRouteCache', () => {
  it('sin la carpeta no falla y no informa nada', async () => {
    await expect(
      pruneRouteCache({ directory: join(directory, 'no-existe'), maxBytes: KB }),
    ).resolves.toEqual({ bytesBefore: 0, bytesAfter: 0, removedEntries: 0 })
  })

  it('por debajo del tope no borra nada', async () => {
    const bytes = (await writePage('mate-uno', 64, 600)) + (await writePage('mate-dos', 64, 300))

    const result = await pruneRouteCache({ directory, maxBytes: 200 * KB })

    expect(result).toEqual({ bytesBefore: bytes, bytesAfter: bytes, removedEntries: 0 })
    expect(await storedSlugs()).toEqual(['mate-dos', 'mate-uno'])
  })

  it('pasado el tope borra páginas enteras, las más viejas primero, hasta el 75 % del tope', async () => {
    // Diez páginas de unos 68 kB: 680 kB contra un tope de 400 kB (objetivo: 300 kB).
    for (let index = 0; index < 10; index += 1) {
      await writePage(`inventado-${String(index)}`, 64, 1000 - index * 60)
    }

    const result = await pruneRouteCache({ directory, maxBytes: 400 * KB })

    expect(result.bytesBefore).toBeGreaterThan(400 * KB)
    expect(result.bytesAfter).toBeLessThanOrEqual(300 * KB)
    expect(result.removedEntries).toBe(6)
    // Quedan las cuatro más nuevas (las de menor antigüedad).
    expect(await storedSlugs()).toEqual([
      'inventado-6',
      'inventado-7',
      'inventado-8',
      'inventado-9',
    ])
    // De las borradas no queda ni un archivo ni su carpeta `.segments`.
    const left = await readdir(join(directory, PRODUCT_ROUTE))
    expect(left.filter((name) => name.startsWith('inventado-0'))).toEqual([])
    expect(left).toHaveLength(4 * 4)
  })

  it('no toca las páginas recién escritas (Next puede estar a mitad de guardarlas)', async () => {
    await writePage('vieja', 64, 600)
    await writePage('recien-escrita', 64, 0)

    const result = await pruneRouteCache({ directory, maxBytes: 10 * KB })

    expect(result.removedEntries).toBe(1)
    expect(await storedSlugs()).toEqual(['recien-escrita'])
  })

  it('rechaza un tope que no es un entero positivo', async () => {
    await expect(pruneRouteCache({ directory, maxBytes: 0 })).rejects.toThrow(RangeError)
    await expect(pruneRouteCache({ directory, maxBytes: 1.5 })).rejects.toThrow(
      'El tope de la caché de páginas tiene que ser un entero positivo de bytes',
    )
  })
})

describe('startRouteCacheLimit', () => {
  it('poda al arrancar y después en cada intervalo, y avisa en el log cuando borra', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const log = vi.fn()
    await writePage('vieja-uno', 64, 900)
    await writePage('vieja-dos', 64, 800)

    const limit = startRouteCacheLimit({ directory, maxBytes: 100 * KB, intervalMs: 60_000, log })
    await limit.idle()

    expect(await storedSlugs()).toEqual(['vieja-dos'])
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/caché de páginas .* pasó el tope .* se borraron 1 páginas guardadas/),
    )

    // Entre una pasada y la otra aparece otra página, más vieja que la que quedó.
    await writePage('vieja-tres', 64, 850)
    await vi.advanceTimersByTimeAsync(60_000)
    await limit.idle()

    expect(await storedSlugs()).toEqual(['vieja-dos'])
    expect(log).toHaveBeenCalledTimes(2)

    limit.stop()
    await writePage('vieja-cuatro', 64, 700)
    await vi.advanceTimersByTimeAsync(120_000)
    expect(await storedSlugs()).toEqual(['vieja-cuatro', 'vieja-dos'])
  })

  it('un error al podar no rompe el servidor: lo avisa y sigue', async () => {
    const log = vi.fn()
    // Un archivo donde se espera una carpeta: leerla falla con ENOTDIR.
    const file = join(directory, 'no-es-carpeta')
    await writeFile(file, 'x')

    const limit = startRouteCacheLimit({ directory: file, maxBytes: KB, intervalMs: 60_000, log })
    await limit.idle()
    limit.stop()

    expect(log).toHaveBeenCalledWith(expect.stringContaining('No se pudo revisar la caché'))
  })
})
