import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ButtonSize, ButtonVariant } from './button-class'
import { Button } from './Button'
import { buttonClass } from './button-class'

afterEach(cleanup)

describe('Button', () => {
  it('es un botón de tipo button por defecto, para no enviar formularios sin querer', () => {
    render(<Button>Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'button')
  })

  it('usa la variante primary y el tamaño md por defecto', () => {
    render(<Button>Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveClass(
      ...buttonClass('primary', 'md').split(' '),
    )
  })

  it.each<[ButtonVariant, ButtonSize]>([
    ['primary', 'md'],
    ['secondary', 'sm'],
    ['ghost', 'md'],
    ['danger', 'sm'],
    ['icon', 'md'],
  ])('la variante %s y el tamaño %s aplican sus clases', (variant, size) => {
    render(
      <Button variant={variant} size={size}>
        Acción
      </Button>,
    )

    expect(screen.getByRole('button', { name: 'Acción' })).toHaveClass(
      ...buttonClass(variant, size).split(' '),
    )
  })

  it('suma el className de quien lo usa', () => {
    render(<Button className="self-start">Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveClass('self-start')
  })

  it('con isLoading se deshabilita, marca aria-busy, muestra el spinner y no dispara el clic', async () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button isLoading onClick={onClick}>
        Guardando…
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Guardando…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('svg')).toHaveClass('animate-spin')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('sin isLoading no marca aria-busy ni muestra el spinner', () => {
    const { container } = render(<Button>Guardar</Button>)

    expect(screen.getByRole('button', { name: 'Guardar' })).not.toHaveAttribute('aria-busy')
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('con disabled no dispara el clic y no se marca como ocupado', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('habilitado dispara el clic', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Guardar</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('entrega el ref al elemento button', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Guardar</Button>)

    expect(ref.current).toBe(screen.getByRole('button', { name: 'Guardar' }))
  })

  it('pasa el resto de las props de button, como aria-label y type submit', () => {
    render(
      <Button variant="icon" type="submit" aria-label="Buscar">
        <span aria-hidden="true">?</span>
      </Button>,
    )

    expect(screen.getByRole('button', { name: 'Buscar' })).toHaveAttribute('type', 'submit')
  })
})
