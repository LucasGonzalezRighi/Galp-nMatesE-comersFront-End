import type { ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { arDayKey } from '@galpon/domain'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { legalSearchSchema } from '../legal-search'
import { LegalContentScreen } from './LegalContentScreen'

/** Lo que hace la ruta `/contenido/legales`: lee `?documento=` y lo cambia al elegir otra pestaña. */
function LegalPage(): ReactNode {
  const search = legalSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  return (
    <LegalContentScreen
      tab={search.documento}
      onTabChange={(next) => {
        void navigate({ to: '/contenido/legales', search: { documento: next } })
      }}
    />
  )
}

async function renderLegal(app: TestApp, path = '/contenido/legales') {
  const result = await renderWithApp(
    <>
      <LegalPage />
      <Toaster />
    </>,
    { app, path, routePath: '/contenido/legales' },
  )
  await screen.findByLabelText('Última actualización')
  return result
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('LegalContentScreen', () => {
  it('muestra el documento de la URL y cambia de documento con las pestañas', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    app.mockDb.db.content.legal.privacy.body = 'Cuidamos tus datos.'
    const { router } = await renderLegal(app, '/contenido/legales?documento=privacidad')

    const nav = screen.getByRole('navigation', { name: 'Secciones del contenido' })
    expect(within(nav).getByRole('link', { name: 'Legales' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByText('Revisá los textos legales con un profesional antes de publicarlos.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Política de privacidad' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('Texto')).toHaveValue('Cuidamos tus datos.')
    expect(screen.getByLabelText('Última actualización')).toHaveAttribute('type', 'date')

    await user.click(screen.getByRole('tab', { name: 'Términos y condiciones' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ documento: 'terminos' })
    })
    expect(await screen.findByDisplayValue('Términos y condiciones')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Términos y condiciones' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('valida antes de guardar: un título vacío da "Requerido"', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const before = structuredClone(app.mockDb.db.content.legal.terms)
    await renderLegal(app)

    await user.clear(screen.getByLabelText('Título'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Requerido')).toBeInTheDocument()
    expect(app.mockDb.db.content.legal.terms).toEqual(before)
  })

  it('al cambiar el texto propone la fecha de hoy y guarda el documento entero', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderLegal(app)

    expect(screen.getByLabelText('Última actualización')).toHaveValue('2026-10-01')
    await user.clear(screen.getByLabelText('Texto'))
    await user.type(screen.getByLabelText('Texto'), 'Primer párrafo.{Enter}{Enter}Segundo.')
    const today = arDayKey(new Date())
    expect(screen.getByLabelText('Última actualización')).toHaveValue(today)

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    expect(app.mockDb.db.content.legal.terms).toEqual({
      title: 'Términos y condiciones',
      body: 'Primer párrafo.\n\nSegundo.',
      updatedAt: today,
    })
  })

  it('no pisa una fecha que se cambió a mano', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderLegal(app)

    fireEvent.change(screen.getByLabelText('Última actualización'), {
      target: { value: '2026-10-20' },
    })
    await user.type(screen.getByLabelText('Texto'), ' Más texto.')

    expect(screen.getByLabelText('Última actualización')).toHaveValue('2026-10-20')
  })
})
