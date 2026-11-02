import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { toast } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { parseAdminEnv } from '../../../lib/env'
import { createTestApp, renderWithApp } from '../../../test/render'
import { AccountScreen } from './AccountScreen'

const env = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })
const NEW_PASSWORD = 'mate-amargo-2026'

/** Dibuja "Mi cuenta" con el `Toaster`, contra la API de prueba con la sesión iniciada. */
async function setup() {
  const app = await createTestApp()
  const user = userEvent.setup()
  await renderWithApp(
    <>
      <AccountScreen />
      <Toaster />
    </>,
    { app, path: '/cuenta' },
  )
  return { app, user }
}

beforeEach(() => {
  toast.dismissAll()
})

describe('AccountScreen', () => {
  it('muestra "Mi cuenta" con la sección para cambiar la contraseña', async () => {
    await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cambiar contraseña' })).toBeInTheDocument()
    expect(screen.getByText('Mínimo 10 caracteres, con letras y números')).toBeInTheDocument()
    expect(document.title).toBe('Mi cuenta · Galpón Admin')
  })

  it('cambia la contraseña, avisa y deja el formulario vacío', async () => {
    const { app, user } = await setup()
    await user.type(screen.getByLabelText('Contraseña actual'), env.mockAdminPassword)
    await user.type(screen.getByLabelText('Contraseña nueva'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Repetí la contraseña nueva'), NEW_PASSWORD)

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('Contraseña cambiada.')).toBeInTheDocument()
    expect(app.mockDb.db.adminAccount.password).toBe(NEW_PASSWORD)
    await waitFor(() => {
      expect(screen.getByLabelText('Contraseña actual')).toHaveValue('')
    })
    expect(screen.getByLabelText('Contraseña nueva')).toHaveValue('')
    expect(screen.getByLabelText('Repetí la contraseña nueva')).toHaveValue('')
  })

  it('con la contraseña actual incorrecta muestra el 422 en su campo', async () => {
    const { app, user } = await setup()
    await user.type(screen.getByLabelText('Contraseña actual'), 'otra-clave-123')
    await user.type(screen.getByLabelText('Contraseña nueva'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Repetí la contraseña nueva'), NEW_PASSWORD)

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('La contraseña actual no es correcta')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('aria-invalid', 'true')
    expect(app.mockDb.db.adminAccount.password).toBe(env.mockAdminPassword)
  })

  it('si la repetición no coincide no envía nada', async () => {
    const { app, user } = await setup()
    await user.type(screen.getByLabelText('Contraseña actual'), env.mockAdminPassword)
    await user.type(screen.getByLabelText('Contraseña nueva'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Repetí la contraseña nueva'), 'otra-cosa-2026')

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(app.mockDb.db.adminAccount.password).toBe(env.mockAdminPassword)
  })
})
