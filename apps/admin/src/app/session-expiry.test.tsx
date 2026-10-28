import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  adminCsrfQuery,
  adminDashboardQuery,
  adminSessionQuery,
  queryKeys,
} from '@galpon/api-client/react'
import type { TestApp } from '../test/render'
import { toast } from '../components/ui/toast'
import { Toaster } from '../components/ui/Toaster'
import { UnsavedChangesGuard } from '../components/ui/UnsavedChangesGuard'
import { AccountScreen, useSessionExpiredStore } from '../features/auth'
import { parseAdminEnv } from '../lib/env'
import { renderWithApp } from '../test/render'
import { createAdminTestApp } from './admin-test-app.test-helper'
import { AdminLayout } from './AdminLayout'

const env = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })
const NEW_PASSWORD = 'mate-amargo-2026'

/**
 * Dibuja "Mi cuenta" dentro de la estructura, con el `Toaster`; con `unsaved`, como si la
 * pantalla tuviera cambios sin guardar (`UnsavedChangesGuard`).
 */
async function renderAccount(app: TestApp, unsaved = false) {
  const user = userEvent.setup()
  const result = await renderWithApp(
    <>
      <AdminLayout context={app.context} email={env.mockAdminEmail}>
        <AccountScreen />
        <UnsavedChangesGuard when={unsaved} />
      </AdminLayout>
      <Toaster />
    </>,
    { app, path: '/cuenta' },
  )
  return { user, ...result }
}

/** Espera a que carguen los contadores, vence la sesión y los vuelve a pedir (da `401`). */
async function expireWhileQuerying(app: TestApp) {
  await screen.findByRole('link', { name: 'Pedidos, 3 para despachar' })
  app.mockDb.db.adminSession = null
  await app.queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() })
}

/** Completa el formulario de cambio de contraseña sin enviarlo. */
async function fillPasswordForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Contraseña actual'), env.mockAdminPassword)
  await user.type(screen.getByLabelText('Contraseña nueva'), NEW_PASSWORD)
  await user.type(screen.getByLabelText('Repetí la contraseña nueva'), NEW_PASSWORD)
}

beforeEach(() => {
  useSessionExpiredStore.setState({ hasSession: false, isExpired: false })
  toast.dismissAll()
})

describe('sesión vencida con una pantalla abierta', () => {
  it('un 401 al guardar abre "Tu sesión venció" y el formulario conserva lo escrito', async () => {
    const app = await createAdminTestApp()
    const { user } = await renderAccount(app)
    await fillPasswordForm(user)
    app.mockDb.db.adminSession = null

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    const dialog = await screen.findByRole('dialog', { name: 'Tu sesión venció' })
    expect(dialog).toHaveAccessibleDescription(
      'Ingresá de nuevo para seguir. Lo que estabas editando sigue en pantalla.',
    )
    expect(within(dialog).getByLabelText('Email')).toHaveValue(env.mockAdminEmail)
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue(env.mockAdminPassword)
    expect(screen.getByLabelText('Contraseña nueva')).toHaveValue(NEW_PASSWORD)
  })

  it('no se cierra con Escape', async () => {
    const app = await createAdminTestApp()
    const { user } = await renderAccount(app)
    await expireWhileQuerying(app)
    await screen.findByRole('dialog', { name: 'Tu sesión venció' })

    await user.keyboard('{Escape}')

    expect(screen.getByRole('dialog', { name: 'Tu sesión venció' })).toBeInTheDocument()
  })

  it('al volver a entrar se cierra, avisa y deja guardar', async () => {
    const app = await createAdminTestApp()
    const { user } = await renderAccount(app)
    await fillPasswordForm(user)
    app.mockDb.db.adminSession = null
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tu sesión venció' })

    await user.type(within(dialog).getByLabelText('Contraseña'), env.mockAdminPassword)
    await user.click(within(dialog).getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Tu sesión venció' })).not.toBeInTheDocument()
    })
    expect(await screen.findByText('Listo, ya podés seguir.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByText('Contraseña cambiada.')).toBeInTheDocument()
    expect(app.mockDb.db.adminAccount.password).toBe(NEW_PASSWORD)
  })

  it('"Ir a la pantalla de ingreso" lleva a /login con la ruta actual', async () => {
    const app = await createAdminTestApp()
    const { router, user } = await renderAccount(app)
    await expireWhileQuerying(app)
    const dialog = await screen.findByRole('dialog', { name: 'Tu sesión venció' })

    await user.click(within(dialog).getByRole('button', { name: 'Ir a la pantalla de ingreso' }))

    expect(await screen.findByText('Ruta de prueba: /login')).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ redirect: '/cuenta' })
    expect(app.queryClient.getQueryData(adminSessionQuery(app.api).queryKey)).toBeUndefined()
  })

  it('si "Ir a la pantalla de ingreso" se cancela por cambios sin guardar, la caché conserva la sesión', async () => {
    const app = await createAdminTestApp()
    const { router, user } = await renderAccount(app, true)
    await expireWhileQuerying(app)
    const dialog = await screen.findByRole('dialog', { name: 'Tu sesión venció' })

    await user.click(within(dialog).getByRole('button', { name: 'Ir a la pantalla de ingreso' }))
    const guard = await screen.findByRole('alertdialog', { name: '¿Salir sin guardar?' })
    await user.click(within(guard).getByRole('button', { name: 'Seguir editando' }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe('/cuenta')
    expect(screen.getByRole('dialog', { name: 'Tu sesión venció' })).toBeInTheDocument()
    expect(app.queryClient.getQueryData(adminSessionQuery(app.api).queryKey)).toEqual(app.session)
    expect(app.queryClient.getQueryData(adminCsrfQuery(app.api).queryKey)).toBeDefined()

    // Si después sale sin guardar, llega a /login ya sin la sesión vieja.
    await user.click(within(dialog).getByRole('button', { name: 'Ir a la pantalla de ingreso' }))
    const again = await screen.findByRole('alertdialog', { name: '¿Salir sin guardar?' })
    await user.click(within(again).getByRole('button', { name: 'Salir sin guardar' }))

    expect(await screen.findByText('Ruta de prueba: /login')).toBeInTheDocument()
    expect(app.queryClient.getQueryData(adminSessionQuery(app.api).queryKey)).toBeUndefined()
    expect(app.queryClient.getQueryData(adminCsrfQuery(app.api).queryKey)).toBeUndefined()
  })

  it('un 401 de la consulta de la sesión o del CSRF no abre el diálogo; el de otra consulta sí', async () => {
    const app = await createAdminTestApp()
    app.mockDb.db.adminSession = null

    await expect(
      app.queryClient.query({ ...adminSessionQuery(app.api), staleTime: 0 }),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
    await expect(
      app.queryClient.query({ ...adminCsrfQuery(app.api), staleTime: 0 }),
    ).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(useSessionExpiredStore.getState().isExpired).toBe(false)

    await expect(app.queryClient.query(adminDashboardQuery(app.api))).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(useSessionExpiredStore.getState().isExpired).toBe(true)
  })

  it('sin una sesión abierta, un 401 no abre el diálogo', async () => {
    const app = await createAdminTestApp({ loggedIn: false })

    await expect(app.queryClient.query(adminDashboardQuery(app.api))).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(useSessionExpiredStore.getState().isExpired).toBe(false)
  })
})

describe('token CSRF rotado', () => {
  it('un 403 al guardar vuelve a pedir el token, avisa y el reintento funciona', async () => {
    const app = await createAdminTestApp()
    const { user } = await renderAccount(app)
    await fillPasswordForm(user)
    app.context.setCsrfToken('token-viejo')

    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('Actualizamos tu sesión. Probá de nuevo.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Tu sesión venció' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    expect(await screen.findByText('Contraseña cambiada.')).toBeInTheDocument()
  })
})
