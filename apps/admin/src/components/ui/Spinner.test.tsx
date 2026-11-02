import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

afterEach(cleanup)

describe('Spinner', () => {
  it('con label se anuncia como estado con ese texto', () => {
    render(<Spinner label="Cargando" />)

    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })

  it('sin label es decorativo: no es un estado y el SVG se oculta a la tecnología asistiva', () => {
    const { container } = render(<Spinner />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('gira y deja de girar con motion-reduce', () => {
    const { container } = render(<Spinner />)

    expect(container.querySelector('svg')).toHaveClass('animate-spin', 'motion-reduce:animate-none')
  })

  it('mide 16 px por defecto y acepta otro tamaño', () => {
    const { container, rerender } = render(<Spinner />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '16')

    rerender(<Spinner size={24} />)
    expect(container.querySelector('svg')).toHaveAttribute('width', '24')
  })

  it('suma las clases que se le pasan', () => {
    const { container } = render(<Spinner className="text-accent" />)

    expect(container.querySelector('svg')).toHaveClass('text-accent')
  })

  it.each([[0], [-4], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'rechaza el tamaño %s con un RangeError en español',
    (size) => {
      expect(() => render(<Spinner size={size} />)).toThrow(RangeError)
    },
  )
})
