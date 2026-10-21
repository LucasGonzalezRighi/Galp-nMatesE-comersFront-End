import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminLoginResult } from '@galpon/api-client'
import { ApiClientProvider } from '@galpon/api-client/react'
import { createAdminApi } from '../../../lib/api'
import { parseAdminEnv } from '../../../lib/env'
import { LoginForm } from './LoginForm'

const env = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })

/** Dibuja el formulario contra la API de prueba y devuelve el `onSuccess` espiado. */
function setup() {
  const { api } = createAdminApi(env, null)
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
