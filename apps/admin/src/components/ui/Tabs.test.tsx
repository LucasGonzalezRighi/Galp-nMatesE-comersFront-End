import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const items = [
  { value: 'pendientes', label: 'Pendientes', count: 3 },
  { value: 'aprobadas', label: 'Aprobadas' },
  { value: 'ocultas', label: 'Ocultas' },
]

describe('Tabs', () => {
  it('es una lista de pestañas controlada, con su nombre y el número de cada una', () => {
    render(
      <Tabs value="pendientes" onValueChange={vi.fn()} label="Estado de las reseñas" items={items}>
        <p>Lista de pendientes</p>
      </Tabs>,
    )

    expect(screen.getByRole('tablist', { name: 'Estado de las reseñas' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pendientes 3' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Aprobadas' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Lista de pendientes')
  })

  it('elegir una pestaña llama a onValueChange sin cambiar sola', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Tabs value="pendientes" onValueChange={onValueChange} label="Estado" items={items} />)

    await user.click(screen.getByRole('tab', { name: 'Ocultas' }))

    expect(onValueChange).toHaveBeenCalledWith('ocultas')
    expect(screen.getByRole('tab', { name: 'Pendientes 3' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
