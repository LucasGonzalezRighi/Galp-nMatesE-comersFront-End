import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockApi, MOCK_ORIGIN, rawRequest } from '../test/mock-api'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from './db'
import { createMockFetch } from './mock-fetch'

const SETTINGS_URL = `${MOCK_ORIGIN}/api/v1/settings/public`

/** Indica si la promesa ya terminó, sin esperarla. */
async function isSettled(promise: Promise<unknown>): Promise<boolean> {
  let settled = false
  void promise.then(() => (settled = true))
  await vi.advanceTimersByTimeAsync(0)
  return settled
}

function loginRequest(password: string): Request {
  return new Request(`${MOCK_ORIGIN}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEFAULT_MOCK_DB_OPTIONS.adminEmail, password }),
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('createMockFetch', () => {
  it('con latencyMs 0 responde sin demora', async () => {
    vi.useFakeTimers()
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
    const response = fetch(new Request(SETTINGS_URL))
    expect(await isSettled(response)).toBe(true)
    expect((await response).status).toBe(200)
  })

  it('espera la latencia fija antes de responder', async () => {
    vi.useFakeTimers()
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const response = createMockFetch({ getDb: () => db, latencyMs: 200 })(new Request(SETTINGS_URL))
    await vi.advanceTimersByTimeAsync(199)
    expect(await isSettled(response)).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await isSettled(response)).toBe(true)
  })

  it('por omisión sortea la latencia entre 150 y 400 ms', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const response = createMockFetch({ getDb: () => db })(new Request(SETTINGS_URL))
    await vi.advanceTimersByTimeAsync(399)
    expect(await isSettled(response)).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await isSettled(response)).toBe(true)
  })

  it('rechaza latencias y prefijos inválidos', () => {
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const getDb = () => db
    expect(() => createMockFetch({ getDb, latencyMs: -1 })).toThrow(RangeError)
    expect(() => createMockFetch({ getDb, latencyMs: Number.NaN })).toThrow(RangeError)
    expect(() => createMockFetch({ getDb, latencyMs: [400, 150] })).toThrow(RangeError)
    expect(() => createMockFetch({ getDb, basePaths: ['api/v1'] })).toThrow(RangeError)
    expect(() => createMockFetch({ getDb, basePaths: [] })).toThrow(RangeError)
  })

  it('usa la base que devuelve getDb en cada pedido', async () => {
    let db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const fetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
    db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    db.settings.contactEmail = 'otra@galpon.test'
    const response = await fetch(new Request(SETTINGS_URL))
    expect(await response.json()).toMatchObject({ contactEmail: 'otra@galpon.test' })
  })

  it('llama a onMutation después del login y no después de un GET ni de un error', async () => {
    const onMutation = vi.fn()
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const fetch = createMockFetch({ getDb: () => db, latencyMs: 0, onMutation })

    await fetch(new Request(SETTINGS_URL))
    expect(onMutation).not.toHaveBeenCalled()

    const failed = await fetch(loginRequest('otra-clave'))
    expect(failed.status).toBe(401)
    expect(onMutation).not.toHaveBeenCalled()

    const login = await fetch(loginRequest(DEFAULT_MOCK_DB_OPTIONS.adminPassword))
    expect(login.status).toBe(200)
    expect(onMutation).toHaveBeenCalledTimes(1)
  })

  it('responde 422 si el cuerpo no es JSON', async () => {
    const response = await rawRequest(createMockApi(), '/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'no es json',
    })
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'validation_error', status: 422 })
  })
})
