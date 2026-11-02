import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createTestApp, renderWithApp } from '../../test/render'
import { ActionsMenu } from './ActionsMenu'
import { ConfirmDialog } from './ConfirmDialog'

describe('ActionsMenu', () => {
  it('el disparador es un botón ícono con aria-label y abre las acciones', async () => {
    const user = userEvent.setup()
    const onArchive = vi.fn()
    render(
      <ActionsMenu
        label="Acciones de Mate imperial"
        items={[{ label: 'Archivar', onSelect: onArchive, tone: 'danger' }]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Acciones de Mate imperial' }))
    const item = await screen.findByRole('menuitem', { name: 'Archivar' })
    expect(item).toHaveClass('text-danger')

    await user.click(item)
    expect(onArchive).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('un enlace interno navega con el router y uno externo abre otra pestaña', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const { router } = await renderWithApp(
      <ActionsMenu
        label="Acciones"
        items={[
          { label: 'Editar', href: '/productos/p1' },
          {
            label: 'Ver en la tienda',
            href: 'http://localhost:3000/producto/mate',
            external: true,
          },
        ]}
      />,
      { app, path: '/productos' },
    )

    await user.click(screen.getByRole('button', { name: 'Acciones' }))
    const external = await screen.findByRole('menuitem', { name: /Ver en la tienda/ })
    expect(external).toHaveAttribute('href', 'http://localhost:3000/producto/mate')
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')

    await user.click(screen.getByRole('menuitem', { name: 'Editar' }))
    expect(await screen.findByText('Ruta de prueba: /productos/p1')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/productos/p1')
  })

  it('acepta dos acciones con el mismo texto sin repetir la clave', async () => {
    const user = userEvent.setup()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const first = vi.fn()
    const second = vi.fn()
    render(
      <ActionsMenu
        label="Acciones"
        items={[
          { label: 'Duplicar', onSelect: first },
          { label: 'Duplicar', onSelect: second },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Acciones' }))
    const actions = await screen.findAllByRole('menuitem', { name: 'Duplicar' })
    expect(actions).toHaveLength(2)
    const [, secondAction] = actions
    if (secondAction === undefined) throw new Error('Falta la segunda acción.')
    await user.click(secondAction)
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('al elegir una acción el foco pasa al disparador, y la confirmación que abre le devuelve el foco al cerrarse', async () => {
    const user = userEvent.setup()
    function WithConfirm() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <ActionsMenu
            label="Acciones de Mate imperial"
            items={[
              {
                label: 'Archivar',
                tone: 'danger',
                onSelect: () => {
                  setOpen(true)
                },
              },
            ]}
          />
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="¿Archivar «Mate imperial»?"
            description="Deja de verse en la tienda."
            confirmLabel="Archivar"
            tone="danger"
            isPending={false}
            onConfirm={vi.fn()}
          />
        </>
      )
    }
    render(<WithConfirm />)

    await user.click(screen.getByRole('button', { name: 'Acciones de Mate imperial' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Archivar' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Acciones de Mate imperial' })).toHaveFocus()
    })
  })

  it('rechaza una acción sin onSelect ni href', () => {
    expect(() => render(<ActionsMenu label="Acciones" items={[{ label: 'Nada' }]} />)).toThrow(
      RangeError,
    )
  })
})
