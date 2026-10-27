import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './Field'
import { MoneyInput } from './MoneyInput'

/** Props del precio controlado de prueba. */
interface PriceFieldProps {
  initial?: number | null
  onValue: (value: number | null) => void
}

/** Campo de precio controlado, como lo usa un `Controller` de React Hook Form. */
function PriceField({ initial = null, onValue }: PriceFieldProps) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <Field label="Precio">
      {(control) => (
        <MoneyInput
          {...control}
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

describe('MoneyInput', () => {
  it('se encuentra por su label, pide el teclado numérico y muestra el valor con formato', () => {
    render(<PriceField initial={39999} onValue={vi.fn()} />)

    const input = screen.getByLabelText('Precio')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveValue('$39.999')
  })

  it.each(['39999', '39.999', '$39.999'])('acepta "%s" como 39999', async (text) => {
    const onValue = vi.fn()
    render(<PriceField onValue={onValue} />)

    await userEvent.type(screen.getByLabelText('Precio'), text)

    expect(onValue).toHaveBeenLastCalledWith(39999)
  })

  it('al salir del campo muestra el monto con formatPesos', async () => {
    render(<PriceField onValue={vi.fn()} />)

    const input = screen.getByLabelText('Precio')
    await userEvent.type(input, '39999')
    expect(input).toHaveValue('39999')
    await userEvent.tab()

    expect(input).toHaveValue('$39.999')
  })

  it('vacío vale null y al salir queda vacío', async () => {
    const onValue = vi.fn()
    render(<PriceField initial={1500} onValue={onValue} />)

    const input = screen.getByLabelText('Precio')
    await userEvent.clear(input)
    await userEvent.tab()

    expect(onValue).toHaveBeenLastCalledWith(null)
    expect(input).toHaveValue('')
  })

  it('ignora las letras', async () => {
    const onValue = vi.fn()
    render(<PriceField onValue={onValue} />)

    const input = screen.getByLabelText('Precio')
    await userEvent.type(input, '3a9b')

    expect(input).toHaveValue('39')
    expect(onValue).toHaveBeenLastCalledWith(39)
  })

  it('nunca guarda decimales', async () => {
    const onValue = vi.fn()
    render(<PriceField onValue={onValue} />)

    const input = screen.getByLabelText('Precio')
    await userEvent.click(input)
    await userEvent.paste('$39.999,50')
    await userEvent.tab()

    expect(onValue).toHaveBeenLastCalledWith(39999)
    expect(input).toHaveValue('$39.999')
  })

  it('llama al onBlur que recibe, como el de un Controller', async () => {
    const onBlur = vi.fn()
    render(<MoneyInput aria-label="Precio" value={null} onChange={vi.fn()} onBlur={onBlur} />)

    await userEvent.click(screen.getByLabelText('Precio'))
    await userEvent.tab()

    expect(onBlur).toHaveBeenCalledOnce()
  })

  it('rechaza un valor que no es un monto con un RangeError en español', () => {
    expect(() =>
      render(<MoneyInput aria-label="Precio" value={10.5} onChange={vi.fn()} />),
    ).toThrow(RangeError)
  })
})
