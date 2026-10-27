import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createTestApp, renderWithApp } from '../../test/render'
import { ActionsMenu } from './ActionsMenu'

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

  it('rechaza una acción sin onSelect ni href', () => {
    expect(() => render(<ActionsMenu label="Acciones" items={[{ label: 'Nada' }]} />)).toThrow(
      RangeError,
    )
  })
})
