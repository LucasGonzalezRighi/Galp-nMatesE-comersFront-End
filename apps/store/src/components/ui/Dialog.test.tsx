// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

afterEach(cleanup)

/** Botón que abre un diálogo con dos botones, para probar el foco. */
function Harness(): ReactNode {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
      >
        Abrir
      </button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title="Confirmar"
      >
        <button type="button">Primero</button>
        <button type="button">Último</button>
      </Dialog>
    </>
  )
}

/** El fondo oscuro que está detrás del panel del diálogo. */
function backdropOf(dialog: HTMLElement): HTMLElement {
  const backdrop = dialog.previousElementSibling
  if (!(backdrop instanceof HTMLElement)) throw new Error('El diálogo no tiene fondo')
  return backdrop
}

describe('Dialog', () => {
  it('cerrado no renderiza nada', () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Hola">
        Contenido
      </Dialog>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abierto es un diálogo modal con el título como nombre', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Verificá tu compra" description="Con tu banco">
        Contenido
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Verificá tu compra' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Con tu banco')
    expect(dialog).toHaveTextContent('Contenido')
  })

  it('cierra con Escape', async () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Hola">
        <button type="button">Uno</button>
      </Dialog>,
    )

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('no cierra con Escape ni con el fondo si no es descartable', async () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Hola" dismissible={false}>
        <button type="button">Uno</button>
      </Dialog>,
    )

    await userEvent.keyboard('{Escape}')
    await userEvent.click(backdropOf(screen.getByRole('dialog')))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('cierra al hacer clic en el fondo, pero no dentro del diálogo', async () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Hola">
        <button type="button">Uno</button>
      </Dialog>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Uno' }))
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.click(backdropOf(screen.getByRole('dialog')))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('mueve el foco adentro al abrir y lo devuelve al botón al cerrar', async () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Abrir' })

    await userEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Primero' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('mantiene el foco dentro con Tab y Mayús+Tab', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    const first = screen.getByRole('button', { name: 'Primero' })
    const last = screen.getByRole('button', { name: 'Último' })

    await userEvent.tab()
    expect(last).toHaveFocus()
    await userEvent.tab()
    expect(first).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('bloquea el scroll de la página mientras está abierto', async () => {
    document.body.style.overflow = 'auto'
    render(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('auto')
  })

  it('con dos diálogos abiertos, Escape cierra solo el de arriba', async () => {
    const closeOuter = vi.fn()
    const closeInner = vi.fn()
    render(
      <>
        <Dialog open onClose={closeOuter} title="Afuera">
          <button type="button">Exterior</button>
        </Dialog>
        <Dialog open onClose={closeInner} title="Adentro">
          <button type="button">Interior</button>
        </Dialog>
      </>,
    )

    await userEvent.keyboard('{Escape}')

    expect(closeInner).toHaveBeenCalledOnce()
    expect(closeOuter).not.toHaveBeenCalled()
  })
})
