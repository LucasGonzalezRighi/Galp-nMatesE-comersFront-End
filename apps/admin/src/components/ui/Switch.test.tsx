import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('es un interruptor que se encuentra por su label y cambia al tocar el texto', async () => {
    const onCheckedChange = vi.fn()
    const ref = createRef<HTMLButtonElement>()
    render(<Switch ref={ref} label="Publicado" onCheckedChange={onCheckedChange} />)

    const control = screen.getByLabelText('Publicado')
    expect(control).toHaveAttribute('role', 'switch')
    expect(control).not.toBeChecked()
    await userEvent.click(screen.getByText('Publicado'))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(control).toBeChecked()
    expect(ref.current).toBe(control)
  })

  it('respeta el id que recibe', () => {
    render(<Switch id="destacado" label="Destacado" />)

    expect(screen.getByLabelText('Destacado')).toHaveAttribute('id', 'destacado')
  })
})
