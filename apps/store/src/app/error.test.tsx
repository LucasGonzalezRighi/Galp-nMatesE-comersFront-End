// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorPage from './error'

afterEach(cleanup)

describe('error.tsx', () => {
  it('avisa que no se pudo cargar la página y "Reintentar" vuelve a intentarlo', async () => {
    const reset = vi.fn<() => void>()
    const user = userEvent.setup()
    render(<ErrorPage error={new Error('boom')} reset={reset} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'No pudimos cargar esta página' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('no muestra el mensaje técnico del error', () => {
    render(<ErrorPage error={new Error('secreto interno')} reset={() => undefined} />)

    expect(screen.queryByText(/secreto interno/)).not.toBeInTheDocument()
  })
})
