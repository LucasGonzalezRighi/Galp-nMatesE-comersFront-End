// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SimulatorNotFound from './not-found'

afterEach(cleanup)

describe('(simulador)/not-found.tsx', () => {
  it('dice "No encontramos esa página" en español y ofrece volver al inicio, sin encabezado ni pie', () => {
    render(<SimulatorNotFound />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})
