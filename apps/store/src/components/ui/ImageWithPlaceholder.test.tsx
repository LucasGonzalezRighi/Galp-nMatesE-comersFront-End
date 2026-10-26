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

  it.each([[null], [undefined], ['']])(
    'sin imagen (%s) muestra una tarjeta de borde punteado con el ícono de imagen',
    (src) => {
      const { container } = render(<ImageWithPlaceholder src={src} alt="Mate imperial" />)

      const placeholder = screen.getByRole('img', { name: 'Mate imperial' })
      expect(placeholder.tagName).toBe('DIV')
      expect(placeholder).toHaveClass('border-dashed')
      expect(container.querySelector('img')).toBeNull()
      expect(placeholder.querySelector('svg')).toHaveAttribute('viewBox', '0 0 256 256')
    },
  )

  it('sin imagen escribe el texto que se le pasa debajo del ícono', () => {
    render(<ImageWithPlaceholder alt="Mate imperial" label="Foto 1 · Mate imperial" />)

    expect(screen.getByText('Foto 1 · Mate imperial')).toBeVisible()
  })

  it('sin imagen ni texto dibuja solo el ícono', () => {
    render(<ImageWithPlaceholder alt="Mate imperial" />)

    expect(screen.getByRole('img', { name: 'Mate imperial' })).toHaveTextContent('')
  })

  it('con imagen no dibuja el texto del marco vacío', () => {
    render(<ImageWithPlaceholder src="/mock-images/mate.jpg" alt="Mate imperial" label="Mate" />)

    expect(screen.queryByText('Mate')).toBeNull()
  })
})
