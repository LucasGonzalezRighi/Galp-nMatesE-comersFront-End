// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PublicSettings } from '@galpon/api-client'
import { CONTACT_COPY } from './contact.copy'
import { ContactPage } from './ContactPage'
import { createTestApi } from './test/support'

afterEach(cleanup)

const EMPTY_SELLER: PublicSettings['seller'] = {
  address: null,
  cuit: null,
  dataFiscalUrl: null,
  legalName: null,
  phone: null,
  supportArea: null,
  supportHours: null,
  taxCondition: null,
}

/** Dibuja la página con el vendedor que se indique. */
function renderPage(seller: Partial<PublicSettings['seller']> = {}): void {
  render(
    createTestApi().wrap(
      <ContactPage
        settings={{
          contactEmail: 'galpon.mates@gmail.com',
          seller: { ...EMPTY_SELLER, ...seller },
        }}
      />,
    ),
  )
}

describe('ContactPage', () => {
  it('muestra el título, el email con su botón y los accesos a las preguntas frecuentes', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: CONTACT_COPY.title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'galpon.mates@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:galpon.mates@gmail.com',
    )
    expect(screen.getByRole('button', { name: CONTACT_COPY.copy })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Envíos y seguimiento' })).toHaveAttribute(
      'href',
      '/preguntas-frecuentes#envios',
    )
    expect(screen.getByRole('link', { name: 'Cambios y devoluciones' })).toHaveAttribute(
      'href',
      '/preguntas-frecuentes#cambios',
    )
    expect(screen.getByRole('link', { name: 'Cómo curar tu mate' })).toHaveAttribute(
      'href',
      '/preguntas-frecuentes#curado',
    )
  })

  it('no muestra los datos de atención mientras el vendedor no los cargó', () => {
    renderPage()

    expect(screen.queryByText(CONTACT_COPY.alternativeChannel)).not.toBeInTheDocument()
    expect(screen.queryByText(CONTACT_COPY.supportArea)).not.toBeInTheDocument()
    expect(screen.queryByText(CONTACT_COPY.supportHours)).not.toBeInTheDocument()
  })

  it('muestra el canal alternativo, el área y el horario que existen, y omite el resto', () => {
    renderPage({ phone: '+54 9 299 123 4567', supportHours: 'Lunes a viernes de 9 a 18' })

    expect(screen.getByText(CONTACT_COPY.alternativeChannel)).toBeInTheDocument()
    expect(screen.getByText('+54 9 299 123 4567')).toBeInTheDocument()
    expect(screen.getByText(CONTACT_COPY.supportHours)).toBeInTheDocument()
    expect(screen.getByText('Lunes a viernes de 9 a 18')).toBeInTheDocument()
    expect(screen.queryByText(CONTACT_COPY.supportArea)).not.toBeInTheDocument()
  })

  it('muestra el área responsable cuando está cargada', () => {
    renderPage({ supportArea: 'Atención al cliente' })

    expect(screen.getByText(CONTACT_COPY.supportArea)).toBeInTheDocument()
    expect(screen.getByText('Atención al cliente')).toBeInTheDocument()
  })
})
