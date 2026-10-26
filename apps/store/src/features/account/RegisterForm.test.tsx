// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCOUNT_COPY } from './account.copy'
import { resetAccountState } from './csrf'
import { RegisterForm } from './RegisterForm'
import { createAccountTestApi, LUCIA, signUp } from './test/support'

/** Router simulado. */
const navigation = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/cuenta/registro',
}))

beforeEach(() => {
  navigation.replace.mockReset()
})

afterEach(cleanup)

/** Completa el alta con los datos de Lucía y el email indicado, y la envía. */
async function fillAndSubmit(email: string): Promise<void> {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(ACCOUNT_COPY.firstName), LUCIA.firstName)
  await user.type(screen.getByLabelText(ACCOUNT_COPY.lastName), LUCIA.lastName)
  await user.type(screen.getByLabelText(ACCOUNT_COPY.email), email)
  await user.type(screen.getByLabelText(ACCOUNT_COPY.password), LUCIA.password)
  await user.click(screen.getByRole('button', { name: ACCOUNT_COPY.register.submit }))
}

describe('RegisterForm', () => {
  it('crea la cuenta, abre la sesión y lleva a /cuenta', async () => {
    const testApi = createAccountTestApi()
    render(testApi.wrap(<RegisterForm />))

    await fillAndSubmit('Paula@Ejemplo.com')

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/cuenta')
    })
    expect(testApi.db.customers.map((customer) => customer.email)).toEqual(['paula@ejemplo.com'])
    expect(testApi.cookies.get('galpon_session')).toEqual(expect.any(String))
  })

  it('con un email que ya tiene cuenta (409) marca el campo y no navega', async () => {
    const testApi = createAccountTestApi()
    await signUp(testApi)
    testApi.cookies.clear()
    await resetAccountState(testApi.queryClient)
    render(testApi.wrap(<RegisterForm />))

    await fillAndSubmit(LUCIA.email)

    expect(await screen.findByText(ACCOUNT_COPY.register.emailTaken)).toBeInTheDocument()
    expect(screen.getByLabelText(ACCOUNT_COPY.email)).toHaveAttribute('aria-invalid', 'true')
    expect(navigation.replace).not.toHaveBeenCalled()
    expect(testApi.db.customers).toHaveLength(1)
  })

  it('pide una contraseña con letras y números antes de llamar a la API', async () => {
    const testApi = createAccountTestApi()
    const user = userEvent.setup()
    render(testApi.wrap(<RegisterForm />))

    await user.type(screen.getByLabelText(ACCOUNT_COPY.password), 'cortita')
    await user.click(screen.getByRole('button', { name: ACCOUNT_COPY.register.submit }))

    expect(
      await screen.findByText('Mínimo 10 caracteres, con letras y números'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(ACCOUNT_COPY.firstName)).toHaveFocus()
    expect(testApi.requests).toHaveLength(0)
  })
})
