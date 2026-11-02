import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTestApp, renderWithApp } from '../../test/render'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'

async function renderGuard(when: boolean) {
  const app = await createTestApp()
  const result = await renderWithApp(
    <>
      <p>Editando el producto</p>
      <UnsavedChangesGuard when={when} />
    </>,
    { app, path: '/productos/p1', routePath: '/productos/$id' },
  )
  act(() => {
    void result.router.navigate({ to: '/pedidos' })
  })
  return result
}

describe('UnsavedChangesGuard', () => {
  it('con cambios frena la navegación y pregunta; "Seguir editando" se queda en la pantalla', async () => {
    const user = userEvent.setup()
    const { router } = await renderGuard(true)

    const dialog = await screen.findByRole('alertdialog', { name: '¿Salir sin guardar?' })
    expect(dialog).toHaveAccessibleDescription(
      'Tenés cambios sin guardar en esta pantalla. Si salís, se pierden.',
    )
    expect(screen.getByRole('button', { name: 'Seguir editando' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Salir sin guardar' })).toHaveClass('bg-danger')

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Editando el producto')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/productos/p1')
  })

  it('"Salir sin guardar" deja seguir la navegación', async () => {
    const user = userEvent.setup()
    const { router } = await renderGuard(true)

    await user.click(await screen.findByRole('button', { name: 'Salir sin guardar' }))

    expect(await screen.findByText('Ruta de prueba: /pedidos')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pedidos')
  })

  it('sin cambios no frena la navegación', async () => {
    await renderGuard(false)

    expect(await screen.findByText('Ruta de prueba: /pedidos')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
