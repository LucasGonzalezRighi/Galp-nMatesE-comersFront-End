import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { adminLogin } from '@galpon/api-client'
import { createAdminApi } from '../../lib/api'
import { parseAdminEnv } from '../../lib/env'
import { ensureAdminSession } from './session'

const env = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })

/** Contexto del router sobre la API de prueba, con el `setCsrfToken` espiado. */
function setup() {
  const { api, mockStatus, setCsrfToken, registerMockImage } = createAdminApi(env, null)
  const spy = vi.fn(setCsrfToken)
  return {
    api,
    context: {
      queryClient: new QueryClient(),
      api,
      apiMode: env.apiMode,
      storeUrl: env.storeUrl,
      setCsrfToken: spy,
      mockStatus,
      registerMockImage,
    },
    spy,
  }
}

describe('ensureAdminSession', () => {
  it('sin sesión propaga el error unauthorized y no toca el token', async () => {
    const { context, spy } = setup()

    await expect(ensureAdminSession(context)).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('con sesión devuelve el email y le pasa al cliente el token vigente', async () => {
    const { api, context, spy } = setup()
    const { csrfToken } = await adminLogin(api, {
      email: env.mockAdminEmail,
      password: env.mockAdminPassword,
    })

    const session = await ensureAdminSession(context)

    expect(session.email).toBe(env.mockAdminEmail)
    expect(spy).toHaveBeenCalledWith(csrfToken)
  })
})
