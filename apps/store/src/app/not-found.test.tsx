// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import NotFound from './not-found'

afterEach(cleanup)

describe('not-found.tsx', () => {
  it('dice "No encontramos esa página" y ofrece volver al inicio o ir a la tienda', () => {
    render(<NotFound />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Ir a la tienda' })).toHaveAttribute('href', '/tienda')
  })
})
