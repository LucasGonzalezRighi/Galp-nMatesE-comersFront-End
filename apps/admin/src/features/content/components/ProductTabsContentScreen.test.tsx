import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { ProductTabsContentScreen } from './ProductTabsContentScreen'

async function renderTabs(app: TestApp) {
  const result = await renderWithApp(
    <>
      <ProductTabsContentScreen />
      <Toaster />
    </>,
    { app, path: '/contenido/pestanas' },
  )
  await screen.findByRole('region', { name: 'Mates' })
  return result
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('ProductTabsContentScreen', () => {
  it('carga un bloque por grupo y el texto de envío común', async () => {
    const app = await createTestApp()
    await renderTabs(app)

    const nav = screen.getByRole('navigation', { name: 'Secciones del contenido' })
    expect(within(nav).getByRole('link', { name: 'Pestañas' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const yerbas = screen.getByRole('region', { name: 'Yerbas' })
    expect(within(yerbas).getByLabelText('Título de la pestaña de materiales')).toHaveValue(
      'Contenido',
    )
    expect(within(yerbas).getByLabelText('Título de la pestaña de cuidado')).toHaveValue(
      'Conservación',
    )
    expect(within(yerbas).getByLabelText('Nota bajo la descripción (opcional)')).toHaveValue('')
    expect(screen.getByLabelText('Envío y cambios (común a todos)')).toHaveValue(
      app.mockDb.db.content.productTabs.shipping,
    )
  })

  it('valida antes de guardar: un título de pestaña vacío da "Requerido"', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const before = structuredClone(app.mockDb.db.content.productTabs)
    await renderTabs(app)

    const mates = screen.getByRole('region', { name: 'Mates' })
    await user.clear(within(mates).getByLabelText('Título de la pestaña de cuidado'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(mates).findByText('Requerido')).toBeInTheDocument()
    expect(app.mockDb.db.content.productTabs).toEqual(before)
  })

  it('guarda los tres grupos y el envío; una nota vacía queda en null', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const expected = structuredClone(app.mockDb.db.content.productTabs)
    await renderTabs(app)

    const mates = screen.getByRole('region', { name: 'Mates' })
    await user.clear(within(mates).getByLabelText('Nota bajo la descripción (opcional)'))
    const bombillas = screen.getByRole('region', { name: 'Bombillas' })
    await user.type(
      within(bombillas).getByLabelText('Nota bajo la descripción (opcional)'),
      'Viene con cepillo.',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    expected.mate.descriptionNote = null
    expected.bombilla.descriptionNote = 'Viene con cepillo.'
    expect(app.mockDb.db.content.productTabs).toEqual(expected)
  })
})
