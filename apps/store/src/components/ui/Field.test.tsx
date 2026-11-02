// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Field } from './Field'
import { Input } from './Input'

afterEach(cleanup)

describe('Field', () => {
  it('asocia la etiqueta con el campo', () => {
    render(<Field label="Correo">{(control) => <Input {...control} />}</Field>)

    expect(screen.getByLabelText('Correo')).toBeInstanceOf(HTMLInputElement)
  })

  it('sin error ni ayuda no marca el campo como inválido ni lo describe', () => {
    render(<Field label="Correo">{(control) => <Input {...control} />}</Field>)

    const input = screen.getByLabelText('Correo')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('con error marca aria-invalid y lo describe con el mensaje', () => {
    render(
      <Field label="Correo" error="Ingresá un correo válido">
        {(control) => <Input {...control} />}
      </Field>,
    )

    const input = screen.getByLabelText('Correo')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Ingresá un correo válido')
    expect(screen.getByText('Ingresá un correo válido')).toBeVisible()
  })

  it('suma la ayuda y el error en la descripción accesible', () => {
    render(
      <Field label="Teléfono" hint="Con característica" error="Faltan dígitos">
        {(control) => <Input {...control} />}
      </Field>,
    )

    expect(screen.getByLabelText('Teléfono')).toHaveAccessibleDescription(
      'Con característica Faltan dígitos',
    )
  })

  it('usa el id recibido para el campo', () => {
    render(
      <Field label="Correo" id="correo">
        {(control) => <Input {...control} />}
      </Field>,
    )

    expect(screen.getByLabelText('Correo')).toHaveAttribute('id', 'correo')
  })
})
