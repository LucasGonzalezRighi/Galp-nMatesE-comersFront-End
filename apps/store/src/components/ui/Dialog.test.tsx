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

/** El contenedor que ocupa toda la pantalla, padre del panel del diálogo. */
function containerOf(dialog: HTMLElement): HTMLElement {
  const container = dialog.parentElement
  if (container === null) throw new Error('El diálogo no tiene contenedor')
  return container
}

describe('Dialog: ubicación y aspecto', () => {
  it('por defecto es una tarjeta centrada con el fondo oscuro de siempre', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Hola">
        Contenido
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')

    expect(containerOf(dialog)).toHaveAttribute('data-placement', 'center')
    expect(containerOf(dialog)).toHaveClass('place-items-center')
    expect(dialog).toHaveClass('bg-surface', 'rounded-lg', 'w-[min(440px,100%)]')
    expect(backdropOf(dialog)).toHaveClass('bg-neutral-900/50')
    expect(backdropOf(dialog)).not.toHaveClass('backdrop-blur-[18px]')
  })

  it('top es la capa del buscador: arriba, sin tarjeta y con la página desenfocada', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Buscar" hideTitle placement="top">
        <input aria-label="Buscar" />
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')

    expect(containerOf(dialog)).toHaveAttribute('data-placement', 'top')
    expect(containerOf(dialog)).toHaveClass('items-start', 'justify-center', 'pt-[10vh]')
    expect(dialog).toHaveClass('w-[min(720px,100%)]')
    expect(dialog).not.toHaveClass('bg-surface', 'rounded-lg', 'shadow-lg')
    expect(backdropOf(dialog)).toHaveClass('bg-background/84', 'backdrop-blur-[18px]')
  })

  it('end es un panel lateral a toda la altura y full cubre toda la pantalla', () => {
    const { rerender } = render(
      <Dialog open onClose={vi.fn()} title="Carrito" placement="end">
        Contenido
      </Dialog>,
    )
    let dialog = screen.getByRole('dialog')
    expect(containerOf(dialog)).toHaveClass('justify-end')
    expect(dialog).toHaveClass('h-full', 'w-[min(440px,100vw)]')
    expect(backdropOf(dialog)).toHaveClass('bg-neutral-900/60', 'backdrop-blur-[4px]')

    rerender(
      <Dialog open onClose={vi.fn()} title="Menú" placement="full">
        Contenido
      </Dialog>,
    )
    dialog = screen.getByRole('dialog')
    expect(containerOf(dialog)).toHaveAttribute('data-placement', 'full')
    expect(dialog).toHaveClass('h-full', 'w-full')
    // El menú queda por debajo del encabezado fijo (z-50); los demás diálogos van por encima.
    expect(containerOf(dialog)).toHaveClass('z-[45]')
    expect(containerOf(dialog)).not.toHaveClass('z-50')
  })

  it('unstyled deja solo las clases propias en el panel, sin las de la ubicación', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Carrito" placement="end" unstyled className="w-80">
        Contenido
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveClass('w-80', 'relative')
    expect(dialog).not.toHaveClass('bg-surface', 'shadow-lg', 'w-[min(440px,100vw)]')
  })

  it('backdropClassName reemplaza el fondo por defecto, no se suma', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Hola" backdropClassName="bg-black/20">
        Contenido
      </Dialog>,
    )
    const backdrop = backdropOf(screen.getByRole('dialog'))

    expect(backdrop).toHaveClass('bg-black/20', 'absolute', 'inset-0')
    expect(backdrop).not.toHaveClass('bg-neutral-900/50')
  })

  it('en cada ubicación sigue cerrando con Escape y con el fondo, y atrapa el foco', async () => {
    for (const placement of ['top', 'end', 'full'] as const) {
      const onClose = vi.fn()
      const { unmount } = render(
        <Dialog open onClose={onClose} title="Hola" placement={placement}>
          <button type="button">Uno</button>
        </Dialog>,
      )
      expect(screen.getByRole('button', { name: 'Uno' })).toHaveFocus()

      await userEvent.tab()
      expect(screen.getByRole('button', { name: 'Uno' })).toHaveFocus()
      await userEvent.keyboard('{Escape}')
      await userEvent.click(backdropOf(screen.getByRole('dialog')))

      expect(onClose, placement).toHaveBeenCalledTimes(2)
      unmount()
    }
  })
})
