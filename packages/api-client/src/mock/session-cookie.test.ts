import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CUSTOMER_SESSION_COOKIE as fromBarrel } from './index'
import { DEFAULT_CUSTOMER_SESSION_COOKIE } from './session-cookie'

describe('session-cookie', () => {
  it('es el mismo nombre que usa el modo de prueba', () => {
    expect(DEFAULT_CUSTOMER_SESSION_COOKIE).toBe('galpon_session')
    expect(fromBarrel).toBe(DEFAULT_CUSTOMER_SESSION_COOKIE)
  })

  it('no importa nada: así proxy.ts no arrastra la base, los fixtures ni los handlers', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./session-cookie.ts', import.meta.url)),
      'utf8',
    )

    expect(source).not.toMatch(/^\s*import\s/m)
    expect(source).not.toMatch(/\sfrom\s+['"]/)
  })
})
