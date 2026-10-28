import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

interface HarnessProps {
  isPending?: boolean
  onConfirm?: () => void
  error?: string
}

function Harness({ isPending = false, onConfirm = vi.fn(), error }: HarnessProps) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <p>{open ? 'abierto' : 'cerrado'}</p>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Archivar «Mate imperial»?"
        description="Deja de verse en la tienda."
        confirmLabel="Archivar"
        tone="danger"
        isPending={isPending}
        onConfirm={onConfirm}
      >
        {error}
      </ConfirmDialog>
    </>
  )
}

describe('ConfirmDialog', () => {
  it('es un alertdialog con su título y descripción, y el foco arranca en "Cancelar"', async () => {
    render(<Harness />)

    const dialog = await screen.findByRole('alertdialog', { name: '¿Archivar «Mate imperial»?' })
    expect(dialog).toHaveAccessibleDescription('Deja de verse en la tienda.')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('Escape cierra el diálogo', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await screen.findByRole('alertdialog')

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('cerrado')).toBeInTheDocument()
  })

  it('con onEscape, Escape llama a onEscape sin cerrar y "Cancelar" sigue cerrando', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        onEscape={onEscape}
        title="¿Archivar «Mate imperial»?"
        description="Deja de verse en la tienda."
        confirmLabel="Archivar"
        tone="danger"
        isPending={false}
        onConfirm={vi.fn()}
      />,
    )
    await screen.findByRole('alertdialog')

    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(onOpenChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('confirmar llama a onConfirm sin cerrar el diálogo', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    await user.click(await screen.findByRole('button', { name: 'Archivar' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('con isPending deshabilita los dos botones, muestra el spinner y no se cierra con Escape', async () => {
    const user = userEvent.setup()
    render(<Harness isPending />)
    await screen.findByRole('alertdialog')

    const confirm = screen.getByRole('button', { name: 'Archivar' })
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    expect(confirm.querySelector('svg')).toHaveClass('animate-spin')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('al cerrarse devuelve el foco al elemento que lo tenía al abrirse', async () => {
    const user = userEvent.setup()
    function WithOpener() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(true)
            }}
          >
            Archivar mate
          </button>
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
    render(<WithOpener />)

    await user.click(screen.getByRole('button', { name: 'Archivar mate' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    // El foco vuelve un cuadro después (por si otro código ya lo movió).
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Archivar mate' })).toHaveFocus()
    })
  })

  it('si al cerrarse otro elemento ya tomó el foco (el h1 al navegar), no lo pisa', async () => {
    const user = userEvent.setup()
    function WithNavigation() {
      const [open, setOpen] = useState(false)
      const [left, setLeft] = useState(false)
      const headingRef = useRef<HTMLHeadingElement>(null)
      useEffect(() => {
        // Como al navegar: la pantalla nueva enfoca su h1 en un efecto, después de cerrarse el diálogo.
        if (left) headingRef.current?.focus()
      }, [left])
      return (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            Pantalla nueva
          </h1>
          <button
            type="button"
            onClick={() => {
              setOpen(true)
            }}
          >
            Salir
          </button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="¿Salir sin guardar?"
            description="Se pierden los cambios."
            confirmLabel="Salir sin guardar"
            tone="danger"
            isPending={false}
            onConfirm={() => {
              setOpen(false)
              setLeft(true)
            }}
          />
        </>
      )
    }
    render(<WithNavigation />)

    await user.click(screen.getByRole('button', { name: 'Salir' }))
    await user.click(await screen.findByRole('button', { name: 'Salir sin guardar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
    })
    // Y un cuadro después sigue en el h1: el diálogo no lo devolvió a "Salir".
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })

  it('con initialFocus="dialog" el foco arranca en el panel y no en "Cancelar"', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Este producto cambió"
        description="Elegí qué versión queda."
        confirmLabel="Guardar igual"
        cancelLabel="Ver la versión guardada"
        tone="danger"
        initialFocus="dialog"
        isPending={false}
        onConfirm={vi.fn()}
      />,
    )

    const dialog = await screen.findByRole('alertdialog', { name: 'Este producto cambió' })
    expect(dialog).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onOpenChange).not.toHaveBeenCalled()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Ver la versión guardada' })).toHaveFocus()
  })

  it('con returnFocusTo el foco va a ese elemento al cerrarse; si devuelve null, al abridor', async () => {
    const user = userEvent.setup()
    function WithTarget() {
      const [open, setOpen] = useState(false)
      const [done, setDone] = useState(false)
      const headingRef = useRef<HTMLHeadingElement>(null)
      return (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            Productos
          </h1>
          {!done && (
            <button
              type="button"
              onClick={() => {
                setOpen(true)
              }}
            >
              Archivar mate
            </button>
          )}
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="¿Archivar «Mate imperial»?"
            description="Deja de verse en la tienda."
            confirmLabel="Archivar"
            tone="danger"
            isPending={false}
            returnFocusTo={() => (done ? headingRef.current : null)}
            onConfirm={() => {
              setDone(true)
              setOpen(false)
            }}
          />
        </>
      )
    }
    render(<WithTarget />)

    await user.click(screen.getByRole('button', { name: 'Archivar mate' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Archivar mate' })).toHaveFocus()
    })

    await user.click(screen.getByRole('button', { name: 'Archivar mate' }))
    await user.click(await screen.findByRole('button', { name: 'Archivar' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toHaveFocus()
    })
  })

  it('muestra el error en línea con role="alert"', async () => {
    render(<Harness error="La línea tiene productos." />)

    expect(await screen.findByRole('alert')).toHaveTextContent('La línea tiene productos.')
  })
})
