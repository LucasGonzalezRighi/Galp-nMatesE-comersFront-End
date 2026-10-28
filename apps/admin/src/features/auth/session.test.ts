import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminLogin } from '@galpon/api-client'
import { adminCsrfQuery, adminSessionQuery } from '@galpon/api-client/react'
import { createAdminApi } from '../../lib/api'
import { parseAdminEnv } from '../../lib/env'
import { ensureAdminSession, storeAdminSession } from './session'
import { useSessionExpiredStore } from './session-expired.store'

beforeEach(() => {
  useSessionExpiredStore.setState({ hasSession: false, isExpired: false })
})

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
    expect(useSessionExpiredStore.getState().hasSession).toBe(true)
  })

  it('no cierra el aviso de sesión vencida que ya está abierto', async () => {
    const { api, context } = setup()
    await adminLogin(api, { email: env.mockAdminEmail, password: env.mockAdminPassword })
    useSessionExpiredStore.setState({ hasSession: true, isExpired: true })

    await ensureAdminSession(context)

    expect(useSessionExpiredStore.getState().isExpired).toBe(true)
  })
})

describe('storeAdminSession', () => {
  it('guarda el token, la sesión y el CSRF en la caché y marca la sesión abierta', async () => {
    const { api, context, spy } = setup()
    useSessionExpiredStore.setState({ hasSession: true, isExpired: true })
    const result = await adminLogin(api, {
      email: env.mockAdminEmail,
      password: env.mockAdminPassword,
    })

    storeAdminSession(context, result)

    expect(spy).toHaveBeenCalledWith(result.csrfToken)
    expect(context.queryClient.getQueryData(adminSessionQuery(api).queryKey)).toEqual({
      email: result.email,
      expiresAt: result.expiresAt,
    })
    expect(context.queryClient.getQueryData(adminCsrfQuery(api).queryKey)).toEqual({
      csrfToken: result.csrfToken,
    })
    expect(useSessionExpiredStore.getState()).toMatchObject({ hasSession: true, isExpired: false })
  })

  it('sin token CSRF lanza RangeError', () => {
    const { context } = setup()

    expect(() => {
      storeAdminSession(context, { email: env.mockAdminEmail, expiresAt: '', csrfToken: ' ' })
    }).toThrow(RangeError)
  })
})
