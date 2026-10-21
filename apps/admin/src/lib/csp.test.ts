import { describe, expect, it } from 'vitest'
import { buildAdminCsp } from './csp'

/** Devuelve una directiva de la política con su valor, o `undefined` si no está. */
function directive(policy: string, name: string): string | undefined {
  return policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))
}

describe('buildAdminCsp', () => {
  const policy = buildAdminCsp('https://api.galponmates.com.ar')

  it('solo permite scripts propios y sin inline', () => {
    expect(policy).toContain("script-src 'self'")
    expect(directive(policy, 'script-src')).not.toContain("'unsafe-inline'")
  })

  it('permite conectarse a la API y a Cloudinary', () => {
    const connect = directive(policy, 'connect-src')
    expect(connect).toContain("'self'")
    expect(connect).toContain('https://api.galponmates.com.ar')
    expect(connect).toContain('https://api.cloudinary.com')
  })

  it('usa solo el origen aunque se pase una URL con ruta', () => {
    expect(directive(buildAdminCsp('https://api.galponmates.com.ar/api/v1'), 'connect-src')).toBe(
      "connect-src 'self' https://api.galponmates.com.ar https://api.cloudinary.com",
    )
  })

  it('sin API (modo de prueba) no agrega ningún origen de la API', () => {
    expect(directive(buildAdminCsp(null), 'connect-src')).toBe(
      "connect-src 'self' https://api.cloudinary.com",
    )
  })

  it('impide que otro sitio lo incruste y limita imágenes y estilos', () => {
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("default-src 'self'")
    expect(directive(policy, 'img-src')).toContain('https://res.cloudinary.com')
  })

  it('rechaza un origen que no es una URL http(s)', () => {
    expect(() => buildAdminCsp('api.galponmates.com.ar')).toThrow(RangeError)
    expect(() => buildAdminCsp("https://x.com; script-src 'unsafe-inline'")).toThrow(RangeError)
    expect(() => buildAdminCsp('https://x.com;script-src.evil.com')).toThrow(RangeError)
  })
})
