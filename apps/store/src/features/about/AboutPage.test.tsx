// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { AboutContent } from '@galpon/api-client'
import { AboutPage } from './AboutPage'

afterEach(cleanup)

const CONTENT: AboutContent = {
  hero: {
    eyebrow: 'Sobre nosotros',
    titleLines: ['Dos socios.', 'Un galpón.', 'La ronda de siempre.'],
    text: 'Galpón nació entre dos socios.',
  },
  partners: [
    { name: 'Bruno Galimberti', role: 'Socio fundador', photo: null },
    { name: 'Nombre del socio', role: 'Socio', photo: null },
  ],
  quote: 'No vendemos lo que no usaríamos.',
  stepsEyebrow: 'Cómo trabajamos',
  steps: [
    { title: 'Elegimos cada calabaza', text: 'Buscamos formas parejas.' },
    { title: 'Alpaca y bronce', text: 'Virolas cinceladas.' },
  ],
  ctaLabel: 'Conocé la tienda',
}

describe('AboutPage', () => {
  it('muestra la portada de tres líneas, la bajada y el botón a la tienda', () => {
    render(<AboutPage content={CONTENT} />)

    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent('Dos socios.')
    expect(title).toHaveTextContent('Un galpón.')
    expect(title).toHaveTextContent('La ronda de siempre.')
    expect(screen.getByText('Sobre nosotros')).toBeInTheDocument()
    expect(screen.getByText('Galpón nació entre dos socios.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conocé la tienda' })).toHaveAttribute(
      'href',
      '/tienda',
    )
  })

  it('muestra a cada socio con su rol y el marco de foto cuando todavía no hay foto', () => {
    render(<AboutPage content={CONTENT} />)

    expect(screen.getByText('Bruno Galimberti')).toBeInTheDocument()
    expect(screen.getByText('Socio fundador')).toBeInTheDocument()
    expect(screen.getByText('Foto · Bruno Galimberti')).toBeInTheDocument()
    expect(screen.getByText('Foto · Nombre del socio')).toBeInTheDocument()
  })

  it('omite la sección de socios si no hay ninguno', () => {
    render(<AboutPage content={{ ...CONTENT, partners: [] }} />)

    expect(screen.queryByText('Bruno Galimberti')).not.toBeInTheDocument()
  })

  it('numera los pasos de "Cómo trabajamos" con dos dígitos', () => {
    render(<AboutPage content={CONTENT} />)

    const steps = screen
      .getAllByRole('listitem')
      .filter((item) => item.querySelector('h3') !== null)
    expect(steps.map((step) => step.querySelector('span')?.textContent)).toEqual(['01', '02'])
    expect(screen.getByRole('heading', { level: 3, name: 'Alpaca y bronce' })).toBeInTheDocument()
  })

  it('la frase está completa en el documento aunque se ilumine con el scroll', () => {
    render(<AboutPage content={CONTENT} />)

    expect(document.body).toHaveTextContent('No vendemos lo que no usaríamos.')
  })
})
