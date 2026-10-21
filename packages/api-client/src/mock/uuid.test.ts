import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomUuid } from './uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** Quita `crypto.randomUUID`, como pasa en un contexto no seguro (HTTP por la red local). */
function stubInsecureContext(): void {
  vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('randomUuid', () => {
  it('usa crypto.randomUUID cuando existe', () => {
    const randomUUID = vi.fn(() => '3b241101-e2bb-4255-8caf-4136c566a962')
    vi.stubGlobal('crypto', { randomUUID, getRandomValues: crypto.getRandomValues.bind(crypto) })
    expect(randomUuid()).toBe('3b241101-e2bb-4255-8caf-4136c566a962')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('sin crypto.randomUUID arma un UUID v4 con getRandomValues', () => {
    stubInsecureContext()
    expect(crypto).not.toHaveProperty('randomUUID')
    for (let attempt = 0; attempt < 20; attempt += 1) expect(randomUuid()).toMatch(UUID_V4)
  })

  it('sin crypto.randomUUID los UUID no se repiten', () => {
    stubInsecureContext()
    const uuids = new Set(Array.from({ length: 50 }, () => randomUuid()))
    expect(uuids.size).toBe(50)
  })

  it('fija la versión y la variante aunque los bytes al azar sean todos 0 o todos 255', () => {
    for (const fill of [0x00, 0xff]) {
      vi.stubGlobal('crypto', {
        getRandomValues: (bytes: Uint8Array) => bytes.fill(fill),
      })
      expect(randomUuid()).toMatch(UUID_V4)
    }
  })
})
