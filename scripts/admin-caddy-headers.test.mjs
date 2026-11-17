import { describe, expect, it } from 'vitest'
import { ADMIN_SECURITY_HEADERS, buildAdminCsp } from '../apps/admin/src/lib/csp.ts'
import { adminCaddyHeaders } from './admin-caddy-headers.mjs'

describe('adminCaddyHeaders', () => {
  it('arma el bloque header de Caddy con la CSP del dashboard y sus cabeceras de seguridad', () => {
    const block = adminCaddyHeaders('https://api.galponmates.com.ar')

    expect(block.startsWith('header {\n')).toBe(true)
    expect(block.endsWith('\n}\n')).toBe(true)
    expect(block).toContain(
      `\tContent-Security-Policy "${buildAdminCsp('https://api.galponmates.com.ar')}"\n`,
    )
    expect(block).toContain("connect-src 'self' https://api.galponmates.com.ar ")
    for (const [name, value] of Object.entries(ADMIN_SECURITY_HEADERS)) {
      expect(block).toContain(`\t${name} "${value}"\n`)
    }
  })

  it('rechaza un origen que no es una URL http(s)', () => {
    expect(() => adminCaddyHeaders('api.galponmates.com.ar')).toThrow(RangeError)
    expect(() => adminCaddyHeaders('')).toThrow(RangeError)
  })
})
