import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionExpiredStore } from './session-expired.store'

beforeEach(() => {
  useSessionExpiredStore.setState({ hasSession: false, isExpired: false })
})

describe('useSessionExpiredStore', () => {
  it('sin una sesión abierta, markSessionExpired no hace nada', () => {
    useSessionExpiredStore.getState().markSessionExpired()

    expect(useSessionExpiredStore.getState().isExpired).toBe(false)
  })

  it('con una sesión abierta la marca vencida, y al volver a entrar deja de estarlo', () => {
    const store = useSessionExpiredStore.getState()
    store.markSessionStarted()
    store.markSessionExpired()
    expect(useSessionExpiredStore.getState()).toMatchObject({ hasSession: true, isExpired: true })

    store.markSessionStarted()
    expect(useSessionExpiredStore.getState()).toMatchObject({ hasSession: true, isExpired: false })
  })

  it('markLoggedOut deja todo como al principio', () => {
    const store = useSessionExpiredStore.getState()
    store.markSessionStarted()
    store.markSessionExpired()

    store.markLoggedOut()

    expect(useSessionExpiredStore.getState()).toMatchObject({ hasSession: false, isExpired: false })
  })
})
