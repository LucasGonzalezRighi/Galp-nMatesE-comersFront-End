// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { IconButton } from './IconButton'

afterEach(cleanup)

describe('Button', () => {
  it('es un botón de tipo button por defecto', () => {
    render(<Button>Comprar</Button>)

    expect(screen.getByRole('button', { name: 'Comprar' })).toHaveAttribute('type', 'button')
  })

  it('con loading marca aria-disabled y aria-busy, conserva el foco y no dispara el clic', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Pagar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Pagar' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toHaveAttribute('disabled')
    expect(button).toHaveAttribute('aria-busy', 'true')
    await user.click(button)
    button.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).not.toHaveBeenCalled()
    expect(button).toHaveFocus()
  })

  it('cargando conserva el foco y no envía el formulario, ni con el clic ni con Enter', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const form = (loading: boolean): ReactNode => (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <input aria-label="Nombre" />
        <Button type="submit" loading={loading}>
          Enviar
        </Button>
      </form>
    )
    const { rerender } = render(form(false))
    const button = screen.getByRole('button', { name: 'Enviar' })
    button.focus()

    rerender(form(true))
    expect(button).toHaveFocus()
    await user.click(button)
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'x{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('con asChild aplica el estilo al enlace sin envolverlo en un botón', () => {
    render(
      <Button asChild variant="primary">
        <a href="https://ejemplo.test/tienda">Ver tienda</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Ver tienda' })
    expect(link).toHaveAttribute('href', 'https://ejemplo.test/tienda')
    expect(link).toHaveClass('border-accent')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('con asChild y loading marca el enlace como no disponible', () => {
    render(
      <Button asChild loading>
        <a href="/pagar">Pagar</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Pagar' })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveAttribute('aria-busy', 'true')
  })

  it.each([['disabled'], ['loading']] as const)(
    'con asChild y %s el enlace no se enfoca con Tab y su clic no navega',
    async (state) => {
      const onClick = vi.fn()
      const clicks: boolean[] = []
      const track = (event: Event): void => {
        clicks.push(event.defaultPrevented)
      }
      document.addEventListener('click', track)
      render(
        <Button asChild {...{ [state]: true }}>
          <a href="/pagar" onClick={onClick}>
            Pagar
          </a>
        </Button>,
      )

      const link = screen.getByRole('link', { name: 'Pagar' })
      expect(link).toHaveAttribute('tabindex', '-1')
      await userEvent.click(link)

      expect(onClick).not.toHaveBeenCalled()
      expect(clicks).toEqual([true])
      document.removeEventListener('click', track)
    },
  )

  it('con asChild habilitado deja el enlace enfocable y navegable', async () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault()
    })
    render(
      <Button asChild>
        <a href="https://ejemplo.test/tienda" onClick={onClick}>
          Ver tienda
        </a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Ver tienda' })
    expect(link).not.toHaveAttribute('tabindex')
    await userEvent.click(link)

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('con asChild exige un único elemento hijo', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Button asChild>solo texto</Button>)).toThrow(RangeError)

    consoleError.mockRestore()
  })
})

describe('IconButton', () => {
  it('se nombra con aria-label y mide 36 por 36', () => {
    render(
      <IconButton aria-label="Cerrar">
        <span aria-hidden="true">×</span>
      </IconButton>,
    )

    const button = screen.getByRole('button', { name: 'Cerrar' })
    expect(button).toHaveClass('size-[36px]')
  })
})
