import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy } from './csp'

/** Devuelve el valor de una directiva de la política, o `undefined` si no está. */
function directive(policy: string, name: string): string | undefined {
  return policy
    .split('; ')
    .find((part) => part === name || part.startsWith(`${name} `))
    ?.slice(name.length)
    .trim()
}

describe('buildContentSecurityPolicy', () => {
  const production = buildContentSecurityPolicy({ isDev: false, apiOrigin: null })

  it('en producción permite scripts propios, en línea y de Mercado Pago, sin eval', () => {
    expect(production).toContain("script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com")
    expect(production).not.toContain("'unsafe-eval'")
  })

  it('prohíbe objetos y el embebido de la tienda en otros sitios', () => {
    expect(production).toContain("object-src 'none'")
    expect(production).toContain("frame-ancestors 'none'")
  })

  it('sigue la política de la sección 16 del spec, directiva por directiva', () => {
    expect(production).toBe(
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://*.mercadopago.com https://*.mlstatic.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://res.cloudinary.com https://*.mlstatic.com https://*.mercadopago.com",
        "font-src 'self'",
        "connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com",
        "frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://*.mercadopago.com",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
      ].join('; '),
    )
  })

  it("frame-src incluye 'self' para el 3-D Secure simulado, que es una página de la tienda", () => {
    expect(directive(production, 'frame-src')).toMatch(/^'self' /)
  })

  it("con framedBySelf solo cambia frame-ancestors a 'self'", () => {
    const framed = buildContentSecurityPolicy({ isDev: false, apiOrigin: null, framedBySelf: true })
    expect(directive(framed, 'frame-ancestors')).toBe("'self'")
    expect(framed.replace("frame-ancestors 'self'", "frame-ancestors 'none'")).toBe(production)
  })

  it('en desarrollo agrega eval a los scripts', () => {
    const development = buildContentSecurityPolicy({ isDev: true, apiOrigin: null })
    expect(directive(development, 'script-src')).toContain("'unsafe-eval'")
  })

  it('con apiOrigin, ese origen aparece en connect-src', () => {
    const policy = buildContentSecurityPolicy({
      isDev: false,
      apiOrigin: 'https://api.galponmates.com.ar',
    })
    expect(directive(policy, 'connect-src')).toContain('https://api.galponmates.com.ar')
  })

  it('normaliza apiOrigin a su origen', () => {
    const policy = buildContentSecurityPolicy({
      isDev: false,
      apiOrigin: 'https://api.galponmates.com.ar/',
    })
    expect(directive(policy, 'connect-src')).toMatch(/ https:\/\/api\.galponmates\.com\.ar$/)
  })

  it.each(['no es una url', 'ftp://api.galponmates.com.ar', 'https://a.com; script-src *'])(
    'rechaza el apiOrigin %j',
    (apiOrigin) => {
      expect(() => buildContentSecurityPolicy({ isDev: false, apiOrigin })).toThrow(RangeError)
    },
  )
})
