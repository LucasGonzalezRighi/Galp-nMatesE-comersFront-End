import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** Lee un archivo relativo a esta carpeta. */
function read(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
}

/** Las reglas de la tienda, sin comentarios. */
const store = read('../../app/globals.css').replace(/\/\*[\s\S]*?\*\//g, '')

/** Lo que va dentro del `@media (pointer: fine)`. */
const fine = store.slice(store.indexOf('@media (pointer: fine)'))

describe('cursor de matecito (globals.css)', () => {
  it('solo con puntero fino: el mate para todo y el que señala para links y botones', () => {
    expect(fine.startsWith('@media (pointer: fine)')).toBe(true)
    expect(fine).toMatch(/body \{\s*cursor:\s*url\('\/cursors\/mate\.png'\) 6 4,\s*auto;/)
    expect(fine).toMatch(
      /a,\s*button,\s*label,\s*select,\s*summary,\s*\[role='button'\] \{\s*cursor:\s*url\('\/cursors\/mate-pointer\.png'\) 6 4,\s*pointer;/,
    )
    expect(fine).toMatch(/input,\s*textarea,\s*\[contenteditable\] \{\s*cursor: text;/)
    expect(fine).toMatch(/:disabled,\s*\[aria-disabled='true'\] \{\s*cursor: not-allowed;/)
    // Fuera del `@media` no hay cursores propios: en el celular no se ven.
    expect(store.slice(0, store.length - fine.length)).not.toContain('/cursors/')
  })

  it('las clases `cursor-pointer` (también `enabled:`) dan el matecito que señala', () => {
    // Las utilidades van en una capa y le ganan a `@layer base`; esta regla va sin capa.
    expect(fine).toMatch(
      /\.cursor-pointer,\s*\.enabled\\:cursor-pointer:enabled \{\s*cursor:\s*url\('\/cursors\/mate-pointer\.png'\) 6 4,\s*pointer;/,
    )
  })

  it('el admin es otra app y no toma el cursor de la tienda', () => {
    expect(read('../../../../admin/src/styles.css')).not.toContain('/cursors/')
  })
})
