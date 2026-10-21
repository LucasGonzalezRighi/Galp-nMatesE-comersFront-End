import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StorageLike } from '@galpon/api-client/mock'
import { adminLogin, adminLogout, getAdminSession, isApiError } from '@galpon/api-client'
import { createAdminApi } from './api'
import { parseAdminEnv } from './env'

/** Almacenamiento en memoria que hace de `sessionStorage`. */
function memoryStorage(): StorageLike {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

const mockEnv = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })
const credentials = { email: mockEnv.mockAdminEmail, password: mockEnv.mockAdminPassword }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createAdminApi en modo de prueba', () => {
  it('el login deja una sesión que getAdminSession reconoce', async () => {
    const { api } = createAdminApi(mockEnv, memoryStorage())
    await expect(getAdminSession(api)).rejects.toMatchObject({ kind: 'unauthorized' })

    await adminLogin(api, credentials)

    await expect(getAdminSession(api)).resolves.toMatchObject({ email: credentials.email })
  })

  it('un createAdminApi nuevo con el mismo almacenamiento simula una recarga y sigue con sesión', async () => {
    const storage = memoryStorage()
    await adminLogin(createAdminApi(mockEnv, storage).api, credentials)

    const reloaded = createAdminApi(mockEnv, storage)

    await expect(getAdminSession(reloaded.api)).resolves.toMatchObject({
      email: credentials.email,
    })
    expect(reloaded.mockStatus?.isPersistent).toBe(true)
  })

  it('sin almacenamiento avisa que no persiste y el login funciona igual', async () => {
    const { api, mockStatus } = createAdminApi(mockEnv, null)

    await adminLogin(api, credentials)

    expect(mockStatus?.isPersistent).toBe(false)
    await expect(getAdminSession(api)).resolves.toMatchObject({ email: credentials.email })
  })

  it('manda en las escrituras el token CSRF guardado con setCsrfToken', async () => {
    const { api, setCsrfToken } = createAdminApi(mockEnv, null)
    const { csrfToken } = await adminLogin(api, credentials)

    const withoutToken = await adminLogout(api).catch((error: unknown) => error)
    expect(isApiError(withoutToken) && withoutToken.kind).toBe('forbidden')

    setCsrfToken(csrfToken)
    await expect(adminLogout(api)).resolves.toBeUndefined()
    await expect(getAdminSession(api)).rejects.toMatchObject({ kind: 'unauthorized' })
  })
})

describe('createAdminApi en modo live', () => {
  it('llama a la API real con cookies y token CSRF, y no tiene estado de prueba', async () => {
    const requests: Request[] = []
    vi.stubGlobal('fetch', (request: Request) => {
      requests.push(request)
      return Promise.resolve(new Response(null, { status: 204 }))
    })
    const env = parseAdminEnv({
      VITE_API_MODE: 'live',
      VITE_API_BASE_URL: 'https://api.galponmates.com.ar',
    })
    const { api, mockStatus, setCsrfToken } = createAdminApi(env, memoryStorage())
    setCsrfToken('token-123')

    await adminLogout(api)

    expect(mockStatus).toBeNull()
    const [request] = requests
    expect(request?.url).toBe('https://api.galponmates.com.ar/api/v1/admin/auth/logout')
    expect(request?.credentials).toBe('include')
    expect(request?.headers.get('X-CSRF-Token')).toBe('token-123')
  })
})
