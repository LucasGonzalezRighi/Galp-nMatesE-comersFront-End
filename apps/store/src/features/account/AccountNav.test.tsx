// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ACCOUNT_COPY } from './account.copy'
import { AccountNav } from './AccountNav'
import { createAccountTestApi, signUp } from './test/support'

/** Router simulado, en el detalle de un pedido. */
const navigation = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.replace, refresh: vi.fn() }),
  usePathname: () => '/cuenta/pedidos/GLP-00001',
}))

afterEach(cleanup)

describe('AccountNav', () => {
  it('marca "Pedidos" también en el detalle de un pedido', async () => {
    const testApi = createAccountTestApi()
    render(testApi.wrap(<AccountNav />))

    expect(await screen.findByRole('link', { name: ACCOUNT_COPY.nav.orders })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: ACCOUNT_COPY.nav.overview })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('cierra la sesión con el token CSRF y vuelve al inicio', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    const user = userEvent.setup()
    render(testApi.wrap(<AccountNav />))

    await user.click(screen.getByRole('button', { name: ACCOUNT_COPY.nav.logout }))

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/')
    })
    expect(testApi.cookies.has('galpon_session')).toBe(false)
    expect(testApi.db.customerSessions.some((session) => session.customerId !== null)).toBe(false)
  })
})
