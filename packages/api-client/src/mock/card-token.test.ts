import { describe, expect, it } from 'vitest'
import { createMockCardToken, parseMockCardToken } from './card-token'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from './db'
import { createMockFetch } from './mock-fetch'

describe('createMockCardToken', () => {
  it('codifica el titular de prueba y los últimos 4, y cambia en cada llamada', () => {
    const token = createMockCardToken({ cardholderName: ' apro ', lastFour: '4242' })
    expect(token).toMatch(/^sim_APRO_4242_[0-9a-f]{32}$/)
    expect(createMockCardToken({ cardholderName: 'APRO', lastFour: '4242' })).not.toBe(token)
    expect(parseMockCardToken(token)).toEqual({ holder: 'APRO', lastFour: '4242' })
  })

  it('un titular que no es de prueba cuenta como OTHE, como en el sandbox', () => {
    const token = createMockCardToken({ cardholderName: 'Lucía Pérez' })
    expect(parseMockCardToken(token)).toEqual({ holder: 'OTHE', lastFour: null })
  })

  it('valida el titular y los últimos dígitos', () => {
    expect(() => createMockCardToken({ cardholderName: '  ' })).toThrow(RangeError)
    expect(() => createMockCardToken({ cardholderName: 'APRO', lastFour: '42' })).toThrow(
      RangeError,
    )
  })

  it('parseMockCardToken no acepta tokens de otro origen', () => {
    expect(parseMockCardToken('tok_real_de_mercadopago')).toBeNull()
    expect(parseMockCardToken(`sim_NADIE_4242_${'a'.repeat(32)}`)).toBeNull()
  })
})

describe('createMockFetch con customerSessionCookie', () => {
  it('usa el nombre configurado en la cookie y rechaza uno inválido', async () => {
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const fetch = createMockFetch({
      getDb: () => db,
      latencyMs: 0,
      customerSessionCookie: '__Host-galpon_session',
    })
    const response = await fetch(new Request('http://localhost/api/v1/auth/csrf'))
    expect(response.headers.getSetCookie()[0]).toMatch(/^__Host-galpon_session=[^;]+; Path=\//)
    expect(() =>
      createMockFetch({ getDb: () => db, customerSessionCookie: 'con espacio' }),
    ).toThrow(RangeError)
  })
})
