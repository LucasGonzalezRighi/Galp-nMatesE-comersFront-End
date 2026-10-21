// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuantityStepper } from './QuantityStepper'

afterEach(cleanup)

describe('QuantityStepper', () => {
  it('muestra la cantidad actual', () => {
    render(<QuantityStepper value={3} max={5} onChange={vi.fn()} />)

    expect(screen.getByText('3')).toBeVisible()
  })

  it('suma y resta de a una unidad', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={3} max={5} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Sumar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Restar' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 4)
    expect(onChange).toHaveBeenNthCalledWith(2, 2)
  })

  it('deshabilita "−" en 1 cuando no se puede quitar', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={1} max={5} onChange={onChange} />)

    const minus = screen.getByRole('button', { name: 'Restar' })
    expect(minus).toBeDisabled()
    await userEvent.click(minus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('deshabilita "+" al llegar al máximo', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={5} max={5} onChange={onChange} />)

    const plus = screen.getByRole('button', { name: 'Sumar' })
    expect(plus).toBeDisabled()
    await userEvent.click(plus)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('con onRemove, "−" en 1 sigue activo y quita la línea', async () => {
    const onChange = vi.fn()
    const onRemove = vi.fn()
    render(<QuantityStepper value={1} max={5} onChange={onChange} onRemove={onRemove} />)

    const remove = screen.getByRole('button', { name: 'Quitar' })
    expect(remove).toBeEnabled()
    await userEvent.click(remove)

    expect(onRemove).toHaveBeenCalledOnce()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('con onRemove, "−" por encima de 1 resta normalmente', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={2} max={5} onChange={onChange} onRemove={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Restar' }))

    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('si la cantidad supera el máximo, "−" la baja hasta el máximo', async () => {
    const onChange = vi.fn()
    render(<QuantityStepper value={9} max={4} onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Sumar' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Restar' }))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('rechaza cantidades y máximos inválidos', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<QuantityStepper value={0} max={5} onChange={vi.fn()} />)).toThrow(
      RangeError,
    )
    expect(() => render(<QuantityStepper value={1.5} max={5} onChange={vi.fn()} />)).toThrow(
      RangeError,
    )
    expect(() => render(<QuantityStepper value={1} max={2.5} onChange={vi.fn()} />)).toThrow(
      RangeError,
    )

    consoleError.mockRestore()
  })
})
