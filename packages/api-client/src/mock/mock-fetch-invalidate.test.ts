import { describe, expect, it, vi } from 'vitest'
import { MOCK_ORIGIN } from '../test/mock-api'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from './db'
import { createMockFetch } from './mock-fetch'

// Ningún handler real invalida caché todavía: se reemplazan por uno que sí lo hace.
vi.mock('./handlers', async () => {
  const { json } = await import('./http')
  const { route } = await import('./router')
  return {
    IMPLEMENTED_ROUTES: [
      route('GET', '/categories', (ctx) => {
        ctx.invalidate(['categories', 'products'])
        return json([])
      }),
    ],
  }
})

describe('createMockFetch con handlers que invalidan caché', () => {
  it('llama a onInvalidate con las etiquetas que pasa el handler', async () => {
    const onInvalidate = vi.fn()
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const fetch = createMockFetch({ getDb: () => db, latencyMs: 0, onInvalidate })
    const response = await fetch(new Request(`${MOCK_ORIGIN}/api/v1/categories`))
    expect(response.status).toBe(200)
    expect(onInvalidate).toHaveBeenCalledExactlyOnceWith(['categories', 'products'])
  })

  it('sin onInvalidate el handler igual responde', async () => {
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
    const response = await fetch(new Request(`${MOCK_ORIGIN}/api/v1/categories`))
    expect(response.status).toBe(200)
  })
})
