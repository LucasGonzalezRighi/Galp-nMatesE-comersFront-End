import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { TextInput } from './TextInput'

describe('TextInput', () => {
  it('se encuentra por su label y es de tipo texto por defecto', () => {
    render(<TextInput aria-label="Nombre" />)

    expect(screen.getByLabelText('Nombre')).toHaveAttribute('type', 'text')
  })

  it('tiene las medidas de .input: alto 36, fondo surface, borde divider y estados de foco y error', () => {
    render(<TextInput aria-label="Nombre" className="max-w-xs" />)

    expect(screen.getByLabelText('Nombre')).toHaveClass(
      'min-h-9',
      'bg-surface',
      'border-divider',
      'rounded-md',
      'text-sm',
      'focus-visible:border-accent',
      'aria-invalid:border-danger-border',
      'max-w-xs',
    )
  })

  it('entrega el ref al input, como pide register de React Hook Form', async () => {
    const ref = createRef<HTMLInputElement>()
    render(<TextInput ref={ref} aria-label="Nombre" />)

    await userEvent.type(screen.getByLabelText('Nombre'), 'Mate')

    expect(ref.current?.value).toBe('Mate')
  })
})
