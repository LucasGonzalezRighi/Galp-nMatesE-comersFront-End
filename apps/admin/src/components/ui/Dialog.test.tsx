import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Dialog } from './Dialog'

function Harness() {
  const [open, setOpen] = useState(true)
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Nueva línea"
      description="Completá los datos."
      size="lg"
      footer={<button type="button">Guardar</button>}
    >
      <p>Contenido</p>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('muestra título, descripción, contenido y pie con el ancho del tamaño', async () => {
    render(<Harness />)

    const dialog = await screen.findByRole('dialog', { name: 'Nueva línea' })
    expect(dialog).toHaveAccessibleDescription('Completá los datos.')
    expect(dialog).toHaveClass('max-w-[720px]', 'bg-surface', 'shadow-lg', 'rounded-lg')
    expect(screen.getByText('Contenido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('"Cerrar" cierra el diálogo', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(await screen.findByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el foco arranca en el primer campo del cuerpo y "Cerrar" va último, arriba a la derecha', async () => {
    render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Nueva línea"
        footer={<button type="button">Guardar</button>}
      >
        <input aria-label="Nombre" />
      </Dialog>,
    )

    const input = await screen.findByRole('textbox', { name: 'Nombre' })
    await waitFor(() => {
      expect(input).toHaveFocus()
    })
    const close = screen.getByRole('button', { name: 'Cerrar' })
    expect(screen.getByRole('dialog').lastElementChild).toBe(close)
    expect(close).toHaveClass('absolute', 'top-4', 'right-4', 'lg:top-6', 'lg:right-6')
  })
})
