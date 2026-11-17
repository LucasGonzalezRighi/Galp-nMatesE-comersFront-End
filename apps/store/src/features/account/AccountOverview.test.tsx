// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMe, listMyAddresses, listMyOrders } from '@galpon/api-client'
import { ACCOUNT_COPY } from './account.copy'
import { AccountOverview } from './AccountOverview'
import { createAccountTestApi, signUp } from './test/support'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/cuenta',
  useSearchParams: () => new URLSearchParams(),
}))

afterEach(cleanup)

describe('AccountOverview', () => {
  it('"Tus datos" muestra el aviso de privacidad con link a /privacidad (spec 14.6)', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    const [customer, orders, addresses] = await Promise.all([
      getMe(testApi.api),
      listMyOrders(testApi.api, 1),
      listMyAddresses(testApi.api),
    ])
    render(
      testApi.wrap(<AccountOverview customer={customer} orders={orders} addresses={addresses} />),
    )

    expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    )
    const sections = screen.getAllByRole('heading', { level: 2 })
    expect(sections.at(-1)).toHaveTextContent(ACCOUNT_COPY.deleteAccount.title)
    expect(
      screen.getByRole('button', { name: ACCOUNT_COPY.deleteAccount.open }),
    ).toBeInTheDocument()
  })
})
