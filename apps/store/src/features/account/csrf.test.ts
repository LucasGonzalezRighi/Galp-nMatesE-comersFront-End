import { describe, expect, it } from 'vitest'
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
})
