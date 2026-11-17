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

  it('con isLoading marca aria-disabled y aria-busy, muestra el spinner y no dispara el clic', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { container } = render(
      <Button isLoading onClick={onClick}>
        Guardando…
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Guardando…' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toHaveAttribute('disabled')
    expect(button).toHaveClass('aria-disabled:opacity-45', 'aria-disabled:cursor-not-allowed')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('svg')).toHaveClass('animate-spin')
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
    const { rerender } = render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <input aria-label="Nombre" />
        <Button type="submit">Guardar</Button>
      </form>,
    )
    const button = screen.getByRole('button', { name: 'Guardar' })
    button.focus()

    rerender(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <input aria-label="Nombre" />
        <Button type="submit" isLoading>
          Guardar
        </Button>
      </form>,
    )
    expect(button).toHaveFocus()
    await user.click(button)
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'x{Enter}')

    expect(onSubmit).not.toHaveBeenCalled()
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
