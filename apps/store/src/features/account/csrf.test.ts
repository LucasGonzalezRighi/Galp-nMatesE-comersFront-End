// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ORDER_SESSION_KEY, readOrderToken, saveOrderSession } from '@/features/checkout'
import { getMe, logout, updateMe } from '@galpon/api-client'
import { queryKeys } from '@galpon/api-client/react'
import { readCsrfToken, resetAccountState, withCsrf } from './csrf'
import { createAccountTestApi, signUp } from './test/support'

describe('withCsrf', () => {
  it('pide el token de la sesión y lo manda en la escritura', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)

    await withCsrf(testApi.queryClient, testApi.api, () =>
      updateMe(testApi.api, { firstName: 'Lu' }),
    )

    const patch = testApi.requests.find((request) => request.method === 'PATCH')
    expect(patch?.headers.get('X-CSRF-Token')).toBe(readCsrfToken())
    await expect(getMe(testApi.api)).resolves.toMatchObject({ firstName: 'Lu' })
  })

  it('con un token viejo (403) pide uno nuevo y reintenta una vez', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    testApi.queryClient.setQueryData(queryKeys.customerCsrf(), { csrfToken: 'token-viejo' })

    await withCsrf(testApi.queryClient, testApi.api, () => logout(testApi.api))

    const logouts = testApi.requests.filter((request) => request.url.endsWith('/auth/logout'))
    expect(logouts.map((request) => request.headers.get('X-CSRF-Token'))).toEqual([
      'token-viejo',
      readCsrfToken(),
    ])
    expect(testApi.cookies.has('galpon_session')).toBe(false)
  })

  it('resetAccountState olvida el token y los datos de la cuenta', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    testApi.queryClient.setQueryData(queryKeys.myAddresses(), [])

    await resetAccountState(testApi.queryClient)

    expect(readCsrfToken()).toBeUndefined()
    expect(testApi.queryClient.getQueryData(queryKeys.myAddresses())).toBeUndefined()
  })

  it('resetAccountState olvida el checkout y el pedido de la pestaña (datos y token del cliente anterior)', async () => {
    const testApi = createAccountTestApi()
    sessionStorage.setItem(
      'galpon.checkout',
      JSON.stringify({
        state: {
          step: 1,
          contact: { email: 'ana@ejemplo.com', firstName: 'Ana', lastName: 'Gil', phone: '' },
          shipping: null,
          attempt: null,
          order: null,
        },
        version: 1,
      }),
    )
    saveOrderSession({ number: 'GLP-00001', orderToken: 'token-de-ana', cartHash: 'abc' })
    expect(sessionStorage.getItem('galpon.checkout')).toContain('ana@ejemplo.com')

    await resetAccountState(testApi.queryClient)

    expect(sessionStorage.getItem('galpon.checkout')).toBeNull()
    expect(sessionStorage.getItem(ORDER_SESSION_KEY)).toBeNull()
    expect(readOrderToken()).toBeUndefined()
  })
})
