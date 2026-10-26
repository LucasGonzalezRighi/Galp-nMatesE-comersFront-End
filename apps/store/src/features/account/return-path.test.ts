import { describe, expect, it } from 'vitest'
import { loginPath, safeReturnPath } from './return-path'

describe('safeReturnPath', () => {
  it.each([
    ['/cuenta/pedidos', '/cuenta/pedidos'],
    ['/cuenta/pedidos/GLP-12345?x=1#arriba', '/cuenta/pedidos/GLP-12345?x=1#arriba'],
    ['/checkout', '/checkout'],
  ])('acepta la ruta interna %s', (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected)
  })

  it.each([
    null,
    '',
    'cuenta',
    '//evil.example/cuenta',
    '/\\evil.example',
    '/\t/evil.example',
    'https://evil.example/cuenta',
    'javascript:alert(1)',
    '/cuenta/ingresar?volver=/cuenta',
    '/cuenta/registro',
  ])('con %j vuelve a /cuenta', (value) => {
    expect(safeReturnPath(value)).toBe('/cuenta')
  })
})

describe('loginPath', () => {
  it('arma la ruta de ingreso con `volver` codificado', () => {
    expect(loginPath('/cuenta/pedidos?pagina=2')).toBe(
      '/cuenta/ingresar?volver=%2Fcuenta%2Fpedidos%3Fpagina%3D2',
    )
  })

  it('rechaza una ruta que no es interna', () => {
    expect(() => loginPath('//evil.example')).toThrow(RangeError)
  })
})
