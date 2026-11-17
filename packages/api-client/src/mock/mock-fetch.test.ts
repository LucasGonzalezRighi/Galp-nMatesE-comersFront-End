import { afterEach, describe, expect, it, vi } from 'vitest'
import { updateAdminFaqContent } from '../services'
import { createMockApi, loginAsAdmin, MOCK_ORIGIN, rawRequest } from '../test/mock-api'
import { MAX_MOCK_ADMIN_BODY_BYTES, MAX_MOCK_BODY_BYTES } from './body'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from './db'
import { FIXTURE_CONTENT } from './fixtures/content'
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

  it('por omisión el piso de la latencia es de 150 ms', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
    const response = createMockFetch({ getDb: () => db })(new Request(SETTINGS_URL))
    await vi.advanceTimersByTimeAsync(149)
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

describe('tope del cuerpo', () => {
  /** Contacto con el campo trampa lleno, de exactamente `bytes` bytes: se lee entero y no se guarda. */
  function trappedContact(bytes: number): string {
    const empty = JSON.stringify({ website: 'x', pad: '' })
    return JSON.stringify({ website: 'x', pad: 'a'.repeat(bytes - empty.length) })
  }

  /** Manda el contacto crudo con las cabeceras dadas. */
  function postContact(
    mock: ReturnType<typeof createMockApi>,
    body: string,
    headers: Record<string, string> = {},
  ) {
    return rawRequest(mock, '/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
    })
  }

  it('lee un cuerpo de 64 kB justos', async () => {
    const body = trappedContact(MAX_MOCK_BODY_BYTES)
    expect(new TextEncoder().encode(body).byteLength).toBe(64 * 1024)
    expect((await postContact(createMockApi(), body)).status).toBe(202)
  })

  it('responde 413 sin leer el cuerpo si Content-Length pasa los 64 kB', async () => {
    const response = await postContact(createMockApi(), '{}', {
      'Content-Length': String(MAX_MOCK_BODY_BYTES + 1),
    })
    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      type: 'payload_too_large',
      title: 'El cuerpo es demasiado grande',
      status: 413,
      detail: 'El cuerpo del pedido pasa los 64 kB.',
    })
  })

  it('responde 413 si lo leído pasa los 64 kB aunque no diga su largo, y no guarda nada', async () => {
    const mock = createMockApi()
    const response = await postContact(mock, trappedContact(MAX_MOCK_BODY_BYTES + 1))
    expect(response.status).toBe(413)
    const valid = JSON.stringify({
      name: 'Lucía Pérez',
      email: 'lucia@ejemplo.com',
      reason: 'Otro',
      message: `Hola. ${'a'.repeat(MAX_MOCK_BODY_BYTES)}`,
    })
    expect((await postContact(mock, valid)).status).toBe(413)
    expect(mock.db.messages).toEqual([])
  })

  it('las rutas del admin que guardan textos largos llegan a 4 MB, después de la sesión', async () => {
    const mock = createMockApi()
    const faq = structuredClone(FIXTURE_CONTENT.faq)
    const [category] = faq.categories
    if (category === undefined) throw new Error('Falta una categoría del FAQ')
    category.items = Array.from({ length: 30 }, (_, index) => ({
      question: `¿Pregunta número ${String(index + 1)}? ${'Detalle. '.repeat(18)}`,
      answer: 'Respuesta larga del FAQ. '.repeat(80),
    }))
    const body = JSON.stringify(faq)
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(MAX_MOCK_BODY_BYTES)

    const anonymous = await rawRequest(mock, '/admin/content/faq', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    expect(anonymous.status).toBe(401)

    await loginAsAdmin(mock)
    await expect(updateAdminFaqContent(mock.api, faq)).resolves.toMatchObject({
      categories: expect.any(Array) as unknown,
    })
    expect(MAX_MOCK_ADMIN_BODY_BYTES).toBe(4 * 1024 * 1024)
  })
})
