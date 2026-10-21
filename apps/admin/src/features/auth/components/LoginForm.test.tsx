import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminLoginResult, ApiClient, ApiFetch } from '@galpon/api-client'
import { createApiClient } from '@galpon/api-client'
import { ApiClientProvider } from '@galpon/api-client/react'
import { createAdminApi } from '../../../lib/api'
import { parseAdminEnv } from '../../../lib/env'
import { LoginForm } from './LoginForm'

const env = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })

/** Cliente cuyo `fetch` es el que se pasa: sirve para simular una red caída o un 422. */
function apiWithFetch(fetch: ApiFetch): ApiClient {
  return createApiClient({ baseUrl: 'http://mock.invalid/api/v1', fetch })
}

/** Dibuja el formulario (contra la API de prueba, o la que se pase) y devuelve el `onSuccess` espiado. */
function setup(api: ApiClient = createAdminApi(env, null).api) {
  const onSuccess = vi.fn<(session: AdminLoginResult) => void>()
  render(
    <ApiClientProvider client={api}>
      <LoginForm onSuccess={onSuccess} />
    </ApiClientProvider>,
  )
  return { onSuccess, user: userEvent.setup() }
}

afterEach(cleanup)

describe('LoginForm', () => {
  it('enviar vacío muestra los errores de cada campo', async () => {
    const { onSuccess, user } = setup()

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Ingresá un email válido')).toBeInTheDocument()
    expect(screen.getByText('Requerido')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('con la contraseña incorrecta muestra una alerta y no avisa éxito', async () => {
    const { onSuccess, user } = setup()
    await user.type(screen.getByLabelText('Email'), env.mockAdminEmail)
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos')
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('sin conexión muestra "No pudimos conectar, probá de nuevo" y no avisa éxito', async () => {
    const { onSuccess, user } = setup(
      apiWithFetch(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await user.type(screen.getByLabelText('Email'), env.mockAdminEmail)
    await user.type(screen.getByLabelText('Contraseña'), env.mockAdminPassword)

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos conectar, probá de nuevo',
    )
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('con un 422 por campo pone el mensaje del servidor en ese campo, sin alerta general', async () => {
    const { onSuccess, user } = setup(
      apiWithFetch(() =>
        Promise.resolve(
          Response.json(
            {
              type: 'validation_error',
              title: 'Datos inválidos',
              status: 422,
              errors: [{ field: 'email', message: 'Ese email no puede iniciar sesión' }],
            },
            { status: 422, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        ),
      ),
    )
    await user.type(screen.getByLabelText('Email'), env.mockAdminEmail)
    await user.type(screen.getByLabelText('Contraseña'), env.mockAdminPassword)

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Ese email no puede iniciar sesión')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('con las credenciales correctas llama a onSuccess con el email', async () => {
    const { onSuccess, user } = setup()
    await user.type(screen.getByLabelText('Email'), env.mockAdminEmail)
    await user.type(screen.getByLabelText('Contraseña'), env.mockAdminPassword)

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
    const session = onSuccess.mock.calls[0]?.[0]
    expect(session?.email).toBe(env.mockAdminEmail)
    expect(session?.csrfToken).toBeTruthy()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
