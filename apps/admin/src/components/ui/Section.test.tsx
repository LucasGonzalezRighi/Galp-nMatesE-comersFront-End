import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Section } from './Section'

describe('Section', () => {
  it('es una región con nombre: tarjeta surface con título h2 text-h4, descripción y acciones', () => {
    render(
      <Section
        title="Fotos"
        description="La primera es la principal."
        actions={<Button variant="secondary">Ordenar</Button>}
      >
        <p>Contenido</p>
      </Section>,
    )

    const region = screen.getByRole('region', { name: 'Fotos' })
    expect(region).toHaveClass('bg-surface', 'shadow-sm', 'rounded-lg', 'p-4', 'lg:p-6')
    expect(screen.getByRole('heading', { level: 2, name: 'Fotos' })).toHaveClass('text-h4')
    expect(screen.getByText('La primera es la principal.')).toHaveClass('text-neutral-400')
    expect(screen.getByRole('button', { name: 'Ordenar' })).toBeInTheDocument()
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })
})
