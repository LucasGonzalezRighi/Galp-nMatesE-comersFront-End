// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LegalPage } from './LegalPage'

afterEach(cleanup)

describe('LegalPage', () => {
  it('muestra el título, la fecha de actualización y el texto en párrafos', () => {
    render(
      <LegalPage
        content={{
          title: 'Términos y condiciones',
          updatedAt: '2026-10-01',
          body: 'Primer párrafo.\n\nSegundo párrafo.',
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Términos y condiciones' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Última actualización: 01/10/2026')).toBeInTheDocument()
    expect(screen.getByText('Primer párrafo.').tagName).toBe('P')
    expect(screen.getByText('Segundo párrafo.').tagName).toBe('P')
  })

  it('muestra el texto como texto, sin interpretarlo como HTML', () => {
    render(
      <LegalPage
        content={{ title: 'Privacidad', updatedAt: '2026-10-01', body: '<b>negrita</b> & más' }}
      />,
    )

    expect(screen.getByText('<b>negrita</b> & más')).toBeInTheDocument()
  })
})
