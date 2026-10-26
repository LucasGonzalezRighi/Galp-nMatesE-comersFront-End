// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ACCOUNT_COPY } from './account.copy'
import { AccountButton } from './AccountButton'
import { createAccountTestApi, signUp } from './test/support'

afterEach(cleanup)

describe('AccountButton', () => {
  it('sin sesión (401 en /me) lleva a ingresar', async () => {
    const testApi = createAccountTestApi()
    render(testApi.wrap(<AccountButton />))

    const link = await screen.findByRole('link', { name: ACCOUNT_COPY.signInLink })
    expect(link).toHaveAttribute('href', '/cuenta/ingresar')
  })

  it('con sesión muestra el nombre y lleva a /cuenta', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    render(testApi.wrap(<AccountButton />))

    const link = await screen.findByRole('link', { name: `${ACCOUNT_COPY.accountLink}, Lucía` })
    expect(link).toHaveAttribute('href', '/cuenta')
    expect(link).toHaveTextContent('Lucía')
  })

  it('fuera de los proveedores muestra el acceso sin consultar la sesión', () => {
    render(<AccountButton />)

    expect(screen.getByRole('link', { name: ACCOUNT_COPY.signInLink })).toHaveAttribute(
      'href',
      '/cuenta/ingresar',
    )
  })
})
