// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { Segmented } from './Segmented'

afterEach(cleanup)

const OPTIONS = [
  { value: 'lisa', label: 'Alpaca lisa' },
  { value: 'cincelada', label: 'Alpaca cincelada' },
  { value: 'acero', label: 'Acero' },
] as const

/** Segmentado controlado, con el valor visible para comprobar el cambio. */
function Harness(): ReactNode {
  const [value, setValue] = useState<(typeof OPTIONS)[number]['value']>('cincelada')
  return (
    <>
      <Segmented label="Virola" options={OPTIONS} value={value} onChange={setValue} />
      <output>{value}</output>
    </>
  )
}

describe('Segmented', () => {
  it('es un grupo de radios con nombre y la opción actual marcada', () => {
    render(<Harness />)

    expect(screen.getByRole('radiogroup', { name: 'Virola' })).toBeVisible()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Alpaca cincelada' })).toBeChecked()
  })

  it('cambia de opción con un clic', async () => {
    render(<Harness />)

    await userEvent.click(screen.getByText('Acero'))

    expect(screen.getByRole('radio', { name: 'Acero' })).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent('acero')
  })

  it('se maneja con las flechas del teclado', async () => {
    render(<Harness />)

    screen.getByRole('radio', { name: 'Alpaca cincelada' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Acero' })).toBeChecked()

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Alpaca lisa' })).toBeChecked()
  })
})
