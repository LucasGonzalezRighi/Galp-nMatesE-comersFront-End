import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import type { SelectOption } from './Select'
import { Select } from './Select'

const OPTIONS: SelectOption[] = [
  { value: 'calabaza', label: 'Calabaza' },
  { value: 'madera', label: 'Madera' },
]

describe('Select', () => {
  it('es un select nativo que se encuentra por su label, con las medidas de .input', () => {
    render(<Select aria-label="Material" options={OPTIONS} />)

    const select = screen.getByLabelText('Material')
    expect(select).toBeInstanceOf(HTMLSelectElement)
    expect(select).toHaveClass('min-h-9', 'bg-surface', 'border-divider')
  })

  it('el placeholder es la primera opción, deshabilitada y elegida mientras no haya valor', () => {
    render(<Select aria-label="Material" placeholder="Elegí un material" options={OPTIONS} />)

    const placeholder = screen.getByRole<HTMLOptionElement>('option', {
      name: 'Elegí un material',
    })
    expect(placeholder).toBeDisabled()
    expect(placeholder.selected).toBe(true)
    expect(screen.getAllByRole('option')[0]).toBe(placeholder)
  })

  it('elegir una opción cambia el valor y llega al ref', async () => {
    const ref = createRef<HTMLSelectElement>()
    render(
      <Select ref={ref} aria-label="Material" placeholder="Elegí un material" options={OPTIONS} />,
    )

    await userEvent.selectOptions(screen.getByLabelText('Material'), 'Madera')

    expect(ref.current?.value).toBe('madera')
  })

  it('rechaza opciones con valores repetidos con un RangeError en español', () => {
    const repeated: SelectOption[] = [...OPTIONS, { value: 'madera', label: 'Otra madera' }]

    expect(() => render(<Select aria-label="Material" options={repeated} />)).toThrow(/repetid/)
  })
})
