import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** Carpeta `apps/store/src/app`. */
const appDir = dirname(fileURLToPath(import.meta.url))

/** El texto de un archivo de `app`. */
function read(path: string): string {
  return readFileSync(join(appDir, path), 'utf8')
}

/**
 * Las páginas (rutas relativas a `app`, con `/`) bajo un segmento dinámico (`[slug]`) que exportan
 * `generateStaticParams`: una página estática por valor del parámetro.
 */
function prerenderedDynamicPages(): string[] {
  return readdirSync(appDir, { recursive: true, encoding: 'utf8' })
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => /\[[^\]/]+\]\/page\.tsx$/.test(path))
    .filter((path) => /export (async )?function generateStaticParams\b/.test(read(path)))
    .sort()
}

describe('rutas dinámicas con generateStaticParams', () => {
  it('son la ficha de producto y la línea de la tienda', () => {
    expect(prerenderedDynamicPages()).toEqual(
      expect.arrayContaining([
        '(tienda)/producto/[slug]/page.tsx',
        '(tienda)/tienda/[linea]/page.tsx',
      ]),
    )
  })

  it("son estáticas enteras (ensureStatic 'navigation'): si no, regenerar categories las deja en 500", () => {
    // Leen el parámetro fuera de `<Suspense>`, así que la App Shell de la ruta queda vacía. Sin
    // `ensureStatic = 'navigation'`, `next start` sirve una página vencida a través de esa App
    // Shell y, cuando vence una etiqueta del layout (el pie lee `categories` y `settings`), la
    // regenera, la rechaza por vacía y responde 500. El E2E `revalidation.spec.ts` lo prueba con
    // la tienda compilada.
    for (const path of prerenderedDynamicPages()) {
      expect(read(path), path).toMatch(/^export const ensureStatic = 'navigation'$/m)
    }
  })
})
