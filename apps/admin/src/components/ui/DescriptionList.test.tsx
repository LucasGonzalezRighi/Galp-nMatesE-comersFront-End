import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DescriptionList } from './DescriptionList'

describe('DescriptionList', () => {
  it('arma un dl con cada término y su detalle, en dos columnas desde 640 px', () => {
    const { container } = render(
      <DescriptionList
        items={[
          { term: 'Cliente', details: 'Ana Pérez' },
          { term: 'Envío', details: 'Correo Argentino' },
        ]}
      />,
    )

    const list = container.querySelector('dl')
    expect(list).toHaveClass('sm:grid-cols-2')
    expect(screen.getByText('Cliente').tagName).toBe('DT')
    expect(screen.getByText('Ana Pérez').tagName).toBe('DD')
    expect(screen.getByText('Correo Argentino').tagName).toBe('DD')
  })

  it('rechaza términos repetidos con un RangeError en español', () => {
    expect(() =>
      render(
        <DescriptionList
          items={[
            { term: 'Cliente', details: 'Ana' },
            { term: 'Cliente', details: 'Juan' },
          ]}
        />,
      ),
    ).toThrow(/repetid/)
  })
})
