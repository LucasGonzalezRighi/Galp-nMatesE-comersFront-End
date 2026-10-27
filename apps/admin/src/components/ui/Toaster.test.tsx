import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { toast, useToastStore } from './toast'
import { Toaster } from './Toaster'

afterEach(() => {
  act(() => {
    toast.dismissAll()
  })
})

describe('toast', () => {
  it('se puede llamar fuera de React y guarda el aviso en el store', () => {
    toast.success('Producto creado.')
    toast.error('No se pudo guardar.')

    expect(useToastStore.getState().toasts.map(({ tone, text }) => ({ tone, text }))).toEqual([
      { tone: 'success', text: 'Producto creado.' },
      { tone: 'error', text: 'No se pudo guardar.' },
    ])
  })

  it('rechaza un texto vacío', () => {
    expect(() => toast.success('  ')).toThrow(RangeError)
    expect(() => toast.error('')).toThrow(RangeError)
  })
})

describe('Toaster', () => {
  it('muestra un aviso de éxito con role="status" y uno de error con role="alert"', async () => {
    render(<Toaster />)

    act(() => {
      toast.success('Cambios guardados.')
      toast.error('No se pudo guardar.')
    })

    const success = await screen.findByText('Cambios guardados.')
    expect(success.closest('li')).toHaveAttribute('role', 'status')
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.')
  })

  it('"Cerrar aviso" saca el aviso de la pantalla y del store', async () => {
    const user = userEvent.setup()
    render(<Toaster />)
    act(() => {
      toast.success('Reseña aprobada.')
    })

    await user.click(await screen.findByRole('button', { name: 'Cerrar aviso' }))

    expect(screen.queryByText('Reseña aprobada.')).not.toBeInTheDocument()
    expect(useToastStore.getState().toasts).toEqual([])
  })
})
