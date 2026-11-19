import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { skipReason } from './install-git-hooks.mjs'

describe('install-git-hooks: cuándo se instalan los hooks de git', () => {
  it('en la compilación de Vercel no se instalan', () => {
    expect(skipReason({ VERCEL: '1' }, true)).toBe('compilación de Vercel')
  })

  it('en la compilación de Render no se instalan', () => {
    expect(skipReason({ RENDER: 'true' }, true)).toBe('compilación de Render')
  })

  it('en un CI no se instalan', () => {
    expect(skipReason({ CI: 'true' }, true)).toBe('integración continua')
  })

  it('fuera de un repositorio de git no se instalan', () => {
    expect(skipReason({}, false)).toBe('la carpeta no es un repositorio de git')
  })

  it('en una compu de desarrollo con git sí se instalan', () => {
    expect(skipReason({}, true)).toBeNull()
  })

  it('el prepare del workspace usa este script', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    expect(manifest.scripts.prepare).toBe('node scripts/install-git-hooks.mjs')
  })
})
