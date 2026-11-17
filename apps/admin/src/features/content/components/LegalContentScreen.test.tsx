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
    app.mockDb.db.content.legal.terms.updatedAt = '2026-10-01'
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

  it('tiene los cuatro documentos y "Política de cookies" carga y guarda el suyo', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const otherBefore = structuredClone(app.mockDb.db.content.legal.terms)
    const { router } = await renderLegal(app)

    expect(
      within(screen.getByRole('tablist', { name: 'Documento legal' }))
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual([
      'Términos y condiciones',
      'Política de privacidad',
      'Política de cookies',
      'Cambios y devoluciones',
    ])

    await user.click(screen.getByRole('tab', { name: 'Política de cookies' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ documento: 'cookies' })
    })
    expect(await screen.findByDisplayValue('Política de cookies')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Política de cookies' })).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Texto'))
    await user.type(screen.getByLabelText('Texto'), 'Solo usamos cookies necesarias.')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    expect(app.mockDb.db.content.legal.cookies).toMatchObject({
      title: 'Política de cookies',
      body: 'Solo usamos cookies necesarias.',
    })
    expect(app.mockDb.db.content.legal.terms).toEqual(otherBefore)
  })

  it('"Cambios y devoluciones" edita el documento de devoluciones', async () => {
    const app = await createTestApp()
    await renderLegal(app, '/contenido/legales?documento=devoluciones')

    expect(screen.getByRole('tab', { name: 'Cambios y devoluciones' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText('Título')).toHaveValue(app.mockDb.db.content.legal.returns.title)
  })

  it('la ayuda explica el formato y lista los 8 datos del vendedor con su valor de hoy', async () => {
    const app = await createTestApp()
    await renderLegal(app)

    const help = screen.getByRole('region', { name: 'Cómo escribir el texto' })
    expect(
      within(help)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Dejá una línea en blanco entre párrafos.',
      'Una línea que empieza con ## es el título de una sección; las que empiezan con - arman una lista.',
      'Un enlace se escribe [texto](/ruta) o [texto](https://…).',
    ])
    const markers = screen.getByRole('region', { name: 'Datos del vendedor' })
    expect(
      within(markers).getByText(
        'Escribí el código tal cual y la tienda lo reemplaza por el dato cargado en Ajustes.',
      ),
    ).toBeInTheDocument()
    const items = await within(markers).findAllByRole('listitem')
    expect(items.map((item) => item.querySelector('code')?.textContent)).toEqual([
      '{{razon_social}}',
      '{{cuit}}',
      '{{condicion_iva}}',
      '{{domicilio}}',
      '{{email}}',
      '{{telefono}}',
      '{{area_atencion}}',
      '{{horario_atencion}}',
    ])
    expect(items[2]).toHaveTextContent('Condición frente al IVA')
    expect(await within(markers).findAllByText('Falta cargarlo en Ajustes')).toHaveLength(7)
    expect(items[4]).toHaveTextContent('Email de contacto')
    expect(items[4]).toHaveTextContent('galpon.mates@gmail.com')
  })

  it('un dato que no existe ({{cuitt}}) se marca bajo el texto y no se guarda', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const before = structuredClone(app.mockDb.db.content.legal.terms)
    await renderLegal(app)

    await user.clear(screen.getByLabelText('Texto'))
    await user.click(screen.getByLabelText('Texto'))
    await user.paste('CUIT: {{cuitt}}')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText(
        'El dato {{cuitt}} no existe. Revisá la lista de datos del vendedor.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Texto')).toHaveAttribute('aria-invalid', 'true')
    expect(app.mockDb.db.content.legal.terms).toEqual(before)
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
