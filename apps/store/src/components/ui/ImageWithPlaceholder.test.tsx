// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ImageWithPlaceholder } from './ImageWithPlaceholder'

afterEach(cleanup)

describe('ImageWithPlaceholder', () => {
  it('con imagen la muestra con su texto alternativo', () => {
    render(<ImageWithPlaceholder src="/mock-images/mate.jpg" alt="Mate imperial" />)

    expect(screen.getByRole('img', { name: 'Mate imperial' })).toHaveAttribute(
      'src',
      expect.stringContaining('mate.jpg'),
    )
  })

  it('trae un sizes por omisión de grilla de productos', () => {
    render(<ImageWithPlaceholder src="/mock-images/mate.jpg" alt="Mate imperial" />)

    expect(screen.getByRole('img', { name: 'Mate imperial' })).toHaveAttribute(
      'sizes',
      '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
    )
  })

  it.each([[null], [undefined], ['']])('sin imagen (%s) muestra la silueta del mate', (src) => {
    const { container } = render(<ImageWithPlaceholder src={src} alt="Mate imperial" />)

    const placeholder = screen.getByRole('img', { name: 'Mate imperial' })
    expect(placeholder.tagName).toBe('DIV')
    expect(container.querySelector('img')).toBeNull()
    expect(placeholder.querySelector('svg')).toBeInTheDocument()
  })
})
