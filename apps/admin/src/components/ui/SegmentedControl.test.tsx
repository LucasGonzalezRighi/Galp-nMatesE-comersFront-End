import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SegmentedOption } from './SegmentedControl'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS: SegmentedOption<string>[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'publicados', label: 'Publicados' },
  { value: 'archivados', label: 'Archivados' },
]

describe('SegmentedControl', () => {
  it('es un grupo de radios con nombre; cada opción se encuentra por su label', () => {
    render(<SegmentedControl label="Estado" options={OPTIONS} value="todos" onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Estado' })).toBeInTheDocument()
    expect(screen.getByLabelText('Todos')).toBeChecked()
    expect(screen.getByLabelText('Publicados')).not.toBeChecked()
  })

  it('elegir otra opción llama a onChange con su valor', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Estado" options={OPTIONS} value="todos" onChange={onChange} />)

    await userEvent.click(screen.getByText('Archivados'))

    expect(onChange).toHaveBeenCalledWith('archivados')
  })

  it('las opciones miden 13 px', () => {
    render(<SegmentedControl label="Estado" options={OPTIONS} value="todos" onChange={vi.fn()} />)

    expect(screen.getByText('Todos').closest('label')).toHaveClass('text-[13px]')
  })

  it('rechaza una lista vacía o con valores repetidos con un RangeError en español', () => {
    const repeated: SegmentedOption<string>[] = [...OPTIONS, { value: 'todos', label: 'Otra vez' }]

    expect(() =>
      render(<SegmentedControl label="Estado" options={[]} value="todos" onChange={vi.fn()} />),
    ).toThrow(RangeError)
    expect(() =>
      render(
        <SegmentedControl label="Estado" options={repeated} value="todos" onChange={vi.fn()} />,
      ),
    ).toThrow(/repetid/)
  })
})
