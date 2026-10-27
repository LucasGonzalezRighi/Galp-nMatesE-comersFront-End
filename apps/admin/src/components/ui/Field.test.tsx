import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'
import { TextInput } from './TextInput'

describe('Field', () => {
  it('conecta el label con el control', () => {
    render(<Field label="Nombre">{(control) => <TextInput {...control} />}</Field>)

    expect(screen.getByLabelText('Nombre')).toBeInstanceOf(HTMLInputElement)
  })

  it('conecta la ayuda y el error por aria-describedby y marca el control como inválido', () => {
    render(
      <Field label="Slug" hint="Solo minúsculas y guiones." error="Ese slug ya existe.">
        {(control) => <TextInput {...control} />}
      </Field>,
    )

    const input = screen.getByLabelText('Slug')
    expect(input).toHaveAccessibleDescription('Solo minúsculas y guiones. Ese slug ya existe.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Ese slug ya existe.')).toHaveAttribute('id', `${input.id}-error`)
    expect(screen.getByText('Ese slug ya existe.')).toHaveClass('text-danger')
    expect(screen.getByText('Solo minúsculas y guiones.')).toHaveClass('text-neutral-400')
  })

  it('sin ayuda ni error no pone aria-describedby ni aria-invalid', () => {
    render(<Field label="Nombre">{(control) => <TextInput {...control} />}</Field>)

    const input = screen.getByLabelText('Nombre')
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('el label mide 12 px al 70 %', () => {
    render(<Field label="Nombre">{(control) => <TextInput {...control} />}</Field>)

    expect(screen.getByText('Nombre')).toHaveClass('text-xs', 'text-foreground/70')
  })

  it('required agrega un asterisco oculto a la tecnología asistiva y aria-required', () => {
    render(
      <Field label="Nombre" required>
        {(control) => <TextInput {...control} />}
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: 'Nombre' })
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })

  it('rechaza un label vacío con un RangeError en español', () => {
    expect(() =>
      render(<Field label=" ">{(control) => <TextInput {...control} />}</Field>),
    ).toThrow(/label/)
  })
})
