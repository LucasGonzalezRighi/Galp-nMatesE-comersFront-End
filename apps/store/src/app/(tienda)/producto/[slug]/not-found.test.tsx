// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ProductNotFound, { metadata } from './not-found'

afterEach(cleanup)

describe('producto/[slug]/not-found.tsx', () => {
  it('dice "No encontramos ese producto." y ofrece volver a la tienda', () => {
    render(<ProductNotFound />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos ese producto.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a la tienda' })).toHaveAttribute(
      'href',
      '/tienda',
    )
  })

  it('no se indexa', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
