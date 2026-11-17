// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LegalMarkerValues } from '@galpon/domain'
import { LegalPage } from './LegalPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const noMarkers: LegalMarkerValues = {
  razon_social: null,
  cuit: null,
  condicion_iva: null,
  domicilio: null,
  email: 'galpon.mates@gmail.com',
  telefono: null,
  area_atencion: null,
  horario_atencion: null,
}

const body = [
  '## Quién te vende',
  'Razón social: {{razon_social}}. CUIT: {{cuit}}. Email: {{email}}. Raro: {{nada}}.',
  '## Tus derechos',
  '- Pedir ver tus datos.\n- Pedir borrarlos en [tu cuenta](/cuenta).',
  'Más en la [AAIP](https://www.argentina.gob.ar/aaip).',
].join('\n\n')

describe('LegalPage', () => {
  it('muestra el título, la fecha y una sección h2 con id por cada título', () => {
    render(
      <LegalPage
        content={{ title: 'Términos y condiciones', updatedAt: '2026-10-01', body }}
        markers={noMarkers}
        missingText="a completar por el vendedor"
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Términos y condiciones' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Última actualización: 01/10/2026')).toBeInTheDocument()
    const sections = screen.getAllByRole('heading', { level: 2 })
    expect(sections.map((heading) => heading.textContent)).toEqual([
      'Quién te vende',
      'Tus derechos',
    ])
    expect(sections[0]).toHaveAttribute('id', 'quien-te-vende')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(document.querySelector('main')).toHaveAttribute('data-legal-page')
  })

  it('resuelve los marcadores y nunca muestra {{ ni }}', () => {
    const { container } = render(
      <LegalPage
        content={{ title: 'Términos', updatedAt: '2026-10-01', body }}
        markers={{ ...noMarkers, cuit: '20-12345678-6' }}
        missingText="a completar por el vendedor"
      />,
    )

    const text = container.textContent
    expect(text).toContain('Razón social: a completar por el vendedor.')
    expect(text).toContain('CUIT: 20-12345678-6.')
    expect(text).toContain('Email: galpon.mates@gmail.com.')
    expect(text).not.toMatch(/\{\{|\}\}/)
  })

  it('sin texto para lo que falta, el dato queda vacío y la página carga igual', () => {
    const { container } = render(
      <LegalPage
        content={{ title: 'Términos', updatedAt: '2026-10-01', body }}
        markers={noMarkers}
        missingText=""
      />,
    )

    expect(container.textContent).not.toContain('a completar')
    expect(container.textContent).not.toMatch(/\{\{|\}\}/)
  })

  it('los enlaces internos van a su ruta y los externos abren en otra pestaña', () => {
    render(
      <LegalPage
        content={{ title: 'Privacidad', updatedAt: '2026-10-01', body }}
        markers={noMarkers}
        missingText=""
      />,
    )

    const account = screen.getByRole('link', { name: 'tu cuenta' })
    expect(account).toHaveAttribute('href', '/cuenta')
    expect(account).not.toHaveAttribute('target')
    const external = screen.getByRole('link', { name: /AAIP/ })
    expect(external).toHaveAttribute('href', 'https://www.argentina.gob.ar/aaip')
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('el botón de imprimir llama a window.print', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    render(
      <LegalPage
        content={{ title: 'Términos', updatedAt: '2026-10-01', body }}
        markers={noMarkers}
        missingText=""
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Imprimir o guardar como PDF' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('muestra el texto como texto, sin interpretarlo como HTML', () => {
    render(
      <LegalPage
        content={{ title: 'Privacidad', updatedAt: '2026-10-01', body: '<b>negrita</b> & más' }}
        markers={noMarkers}
        missingText=""
      />,
    )

    expect(screen.getByText('<b>negrita</b> & más')).toBeInTheDocument()
  })
})
