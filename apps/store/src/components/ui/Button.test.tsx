// @vitest-environment jsdom
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

  it('con loading se deshabilita, avisa que está ocupado y no dispara el clic', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Pagar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Pagar' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('con asChild aplica el estilo al enlace sin envolverlo en un botón', () => {
    render(
      <Button asChild variant="primary">
        <a href="/tienda">Ver tienda</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Ver tienda' })
    expect(link).toHaveAttribute('href', '/tienda')
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
