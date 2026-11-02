import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('es un checkbox nativo que se encuentra por su label y se marca al tocar el texto', async () => {
    const ref = createRef<HTMLInputElement>()
    render(<Checkbox ref={ref} label="Destacado" />)

    const checkbox = screen.getByLabelText('Destacado')
    expect(checkbox).toHaveAttribute('type', 'checkbox')
    await userEvent.click(screen.getByText('Destacado'))

    expect(checkbox).toBeChecked()
    expect(ref.current).toBe(checkbox)
  })
})
