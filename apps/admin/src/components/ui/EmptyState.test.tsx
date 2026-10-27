import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('muestra el título, la descripción y la acción', () => {
    render(
      <EmptyState
        title="Todavía no hay productos"
        description="Cargá el primero para verlo en la tienda."
        action={<Button>Nuevo producto</Button>}
      />,
    )

    expect(screen.getByText('Todavía no hay productos')).toBeInTheDocument()
    expect(screen.getByText('Cargá el primero para verlo en la tienda.')).toHaveClass(
      'text-neutral-400',
    )
    expect(screen.getByRole('button', { name: 'Nuevo producto' })).toBeInTheDocument()
  })
})
