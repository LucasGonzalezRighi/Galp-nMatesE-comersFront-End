import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './Field'
import { NumberInput } from './NumberInput'

/** Props del número controlado de prueba. */
interface WeightFieldProps {
  allowDecimal?: boolean
  initial?: number | null
  onValue: (value: number | null) => void
}

/** Campo numérico controlado, como lo usa un `Controller` de React Hook Form. */
function WeightField({ allowDecimal, initial = null, onValue }: WeightFieldProps) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <Field label="Peso">
      {(control) => (
        <NumberInput
          {...control}
          allowDecimal={allowDecimal}
          value={value}
          onChange={(next) => {
            setValue(next)
            onValue(next)
          }}
        />
      )}
    </Field>
  )
}

describe('NumberInput', () => {
  it('entero: se encuentra por su label, pide el teclado numérico y no acepta decimales', async () => {
    const onValue = vi.fn()
    render(<WeightField onValue={onValue} />)

    const input = screen.getByLabelText('Peso')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    await userEvent.type(input, '12a')

    expect(input).toHaveValue('12')
    expect(onValue).toHaveBeenLastCalledWith(12)
  })

  it('con allowDecimal acepta la coma decimal: "10,5" vale 10.5', async () => {
    const onValue = vi.fn()
    render(<WeightField allowDecimal onValue={onValue} />)

    const input = screen.getByLabelText('Peso')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    await userEvent.type(input, '10,5')
    await userEvent.tab()

    expect(onValue).toHaveBeenLastCalledWith(10.5)
    expect(input).toHaveValue('10,5')
  })

  it('muestra el valor inicial con coma y vacío vale null', async () => {
    const onValue = vi.fn()
    render(<WeightField allowDecimal initial={0.75} onValue={onValue} />)

    const input = screen.getByLabelText('Peso')
    expect(input).toHaveValue('0,75')
    await userEvent.clear(input)

    expect(onValue).toHaveBeenLastCalledWith(null)
  })
})
