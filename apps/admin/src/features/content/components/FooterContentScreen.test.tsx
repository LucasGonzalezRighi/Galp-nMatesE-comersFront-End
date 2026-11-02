import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { validationProblem } from '../../../test/problem-response'
import { createTestApp, renderWithApp } from '../../../test/render'
import { FooterContentScreen } from './FooterContentScreen'

async function renderFooter(app: TestApp) {
  const result = await renderWithApp(
    <>
      <FooterContentScreen />
      <Toaster />
    </>,
    { app, path: '/contenido/pie' },
  )
  await screen.findByRole('region', { name: 'Pie de página' })
  return result
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('FooterContentScreen', () => {
  it('carga la frase, el texto y los medios de pago', async () => {
    const app = await createTestApp()
    await renderFooter(app)

    const nav = screen.getByRole('navigation', { name: 'Secciones del contenido' })
    expect(within(nav).getByRole('link', { name: 'Pie' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByLabelText('Frase')).toHaveValue('Hechos para compartir.')
    const methods = screen.getByRole('group', { name: 'Medios de pago' })
    expect(within(methods).getByLabelText('Medio de pago 1')).toHaveValue('Mercado Pago')
    expect(within(methods).getByLabelText('Medio de pago 4')).toHaveValue('American Express')
    expect(screen.getByLabelText('Link a Defensa del Consumidor (opcional)')).toHaveValue('')
  })

  it('valida el link a Defensa del Consumidor', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const before = structuredClone(app.mockDb.db.content.footer)
    await renderFooter(app)

    await user.type(
      screen.getByLabelText('Link a Defensa del Consumidor (opcional)'),
      'autoconsumo.gob.ar',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('Ingresá una URL válida, con http:// o https://'),
    ).toBeInTheDocument()
    expect(app.mockDb.db.content.footer).toEqual(before)
  })

  it('un 422 va a su campo y, si trae una ruta sin campo, también avisa el mensaje', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    app.api.use({
      onRequest: ({ request }) =>
        request.method === 'PUT'
          ? validationProblem(
              [
                { field: 'tagline', message: 'Esa frase no se puede usar.' },
                { field: 'brand.logo', message: 'Falta el logo.' },
              ],
              'Revisá el pie de página.',
            )
          : undefined,
    })
    await renderFooter(app)

    await user.type(screen.getByLabelText('Frase'), ' Siempre.')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Esa frase no se puede usar.')).toBeInTheDocument()
    expect(screen.getByLabelText('Frase')).toHaveAttribute('aria-invalid', 'true')
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisá el pie de página.')
    expect(screen.queryByText('Falta el logo.')).not.toBeInTheDocument()
  })

  it('agrega y quita medios de pago y guarda el pie entero', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderFooter(app)

    const methods = screen.getByRole('group', { name: 'Medios de pago' })
    await user.click(within(methods).getByRole('button', { name: 'Agregar medio de pago' }))
    await user.type(within(methods).getByLabelText('Medio de pago 5'), 'Naranja X')
    await user.click(within(methods).getByRole('button', { name: 'Quitar el medio de pago 2' }))
    await user.type(
      screen.getByLabelText('Link a Defensa del Consumidor (opcional)'),
      'https://www.argentina.gob.ar/produccion/defensadelconsumidor',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    expect(app.mockDb.db.content.footer).toEqual({
      tagline: 'Hechos para compartir.',
      text: 'Mates, bombillones y yerba con envío a todo el país.',
      paymentMethods: ['Mercado Pago', 'Mastercard', 'American Express', 'Naranja X'],
      consumerDefenseUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor',
    })
  })
})
