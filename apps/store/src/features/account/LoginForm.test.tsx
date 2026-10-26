// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCOUNT_COPY } from './account.copy'
import { resetAccountState } from './csrf'
import { LoginForm } from './LoginForm'
import { createAccountTestApi, LUCIA, offlineFetch, signUp } from './test/support'

/** Router y búsqueda simulados: cada prueba los cambia antes de dibujar. */
const navigation = vi.hoisted(() => ({ replace: vi.fn(), search: '' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.search),
  usePathname: () => '/cuenta/ingresar',
}))

beforeEach(() => {
  navigation.replace.mockReset()
  navigation.search = ''
})

afterEach(cleanup)

/** Crea la cuenta de Lucía y cierra la sesión, como si volviera otro día. */
async function existingCustomer(): Promise<ReturnType<typeof createAccountTestApi>> {
  const testApi = createAccountTestApi()
  await signUp(testApi)
  testApi.cookies.clear()
  await resetAccountState(testApi.queryClient)
  return testApi
}

/** Completa el formulario y lo envía. */
async function submit(email: string, password: string): Promise<void> {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(ACCOUNT_COPY.email), email)
  await user.type(screen.getByLabelText(ACCOUNT_COPY.password), password)
  await user.click(screen.getByRole('button', { name: ACCOUNT_COPY.login.submit }))
}

describe('LoginForm', () => {
  it('con email o contraseña incorrectos (401) lo avisa y no navega', async () => {
    const testApi = await existingCustomer()
    render(testApi.wrap(<LoginForm />))

    await submit(LUCIA.email, 'otra-clave-123')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      ACCOUNT_COPY.login.invalidCredentials,
    )
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('inicia sesión con el token CSRF y vuelve a la página de `volver`', async () => {
    const testApi = await existingCustomer()
    navigation.search = '?volver=%2Fcuenta%2Fpedidos'
    render(testApi.wrap(<LoginForm />))

    await submit(LUCIA.email, LUCIA.password)

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/cuenta/pedidos')
    })
    const loginRequest = testApi.requests.find((request) => request.url.endsWith('/auth/login'))
    expect(loginRequest?.headers.get('X-CSRF-Token')).toEqual(expect.any(String))
    const session = testApi.db.customerSessions.find(
      (candidate) => candidate.id === testApi.cookies.get('galpon_session'),
    )
    expect(session?.customerId).toBe(testApi.db.customers[0]?.id)
  })

  it('no vuelve a otro sitio aunque `volver` lo pida', async () => {
    const testApi = await existingCustomer()
    navigation.search = '?volver=%2F%2Fevil.example%2Fcuenta'
    render(testApi.wrap(<LoginForm />))

    await submit(LUCIA.email, LUCIA.password)

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/cuenta')
    })
  })

  it('marca el email inválido al salir del campo, sin llamar a la API', async () => {
    const testApi = createAccountTestApi()
    const user = userEvent.setup()
    render(testApi.wrap(<LoginForm />))

    await user.type(screen.getByLabelText(ACCOUNT_COPY.email), 'lucia@')
    await user.tab()

    expect(await screen.findByText('Ingresá un email válido')).toBeInTheDocument()
    expect(screen.getByLabelText(ACCOUNT_COPY.email)).toHaveAttribute('aria-invalid', 'true')
    expect(testApi.requests).toHaveLength(0)
  })

  it('sin conexión muestra "No pudimos conectar, probá de nuevo"', async () => {
    const testApi = createAccountTestApi(offlineFetch)
    render(testApi.wrap(<LoginForm />))

    await submit(LUCIA.email, LUCIA.password)

    expect(await screen.findByRole('alert')).toHaveTextContent(ACCOUNT_COPY.networkError)
  })
})
