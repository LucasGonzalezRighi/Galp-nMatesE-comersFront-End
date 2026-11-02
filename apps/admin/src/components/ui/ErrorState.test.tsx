import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('se anuncia como alerta con el título y la descripción, y "Reintentar" llama a onRetry', async () => {
    const onRetry = vi.fn()
    render(
      <ErrorState
        title="No pudimos cargar los pedidos"
        description="Revisá la conexión."
        onRetry={onRetry}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar los pedidos')
    expect(alert).toHaveTextContent('Revisá la conexión.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
