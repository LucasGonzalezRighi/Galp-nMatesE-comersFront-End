import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { failBackgroundReload } from '../../../test/fail-background-reload'
import { validationProblem } from '../../../test/problem-response'
import { createTestApp, renderWithApp } from '../../../test/render'
import { SettingsScreen } from './SettingsScreen'

/** Monta `/ajustes` con los avisos (con la app que se pase o una nueva). */
async function setup(app?: TestApp) {
  const testApp = app ?? (await createTestApp())
  const user = userEvent.setup()
  const result = await renderWithApp(
    <>
      <SettingsScreen />
      <Toaster />
    </>,
    { app: testApp, path: '/ajustes' },
  )
  await screen.findByRole('textbox', { name: /^Descuento del kit/ })
  return { ...result, app: testApp, user }
}

/** El grupo de campos de un método de envío, por su nombre. */
function shippingGroup(name: string): HTMLElement {
  return screen.getByRole('group', { name })
}

/** Reemplaza el texto de un campo. */
async function retype(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, text: string) {
  await user.clear(field)
  await user.type(field, text)
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('SettingsScreen', () => {
  it('muestra los ajustes guardados por sección', async () => {
    await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Kit',
      'Envíos',
      'Cuotas',
      'Precio sin impuestos nacionales',
      'Vendedor y atención al cliente',
      'Defensa del consumidor',
      'Contacto',
      'Stock',
    ])
    expect(screen.getByRole('textbox', { name: /^Condición frente al IVA/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Domicilio legal/ })).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: /^Teléfono o canal alternativo \(opcional\)/ }),
    ).toBeInTheDocument()
    const dataFiscal = screen.getByRole('textbox', { name: /^Data Fiscal \(ARCA\)/ })
    expect(dataFiscal).not.toHaveAttribute('type', 'url')
    expect(dataFiscal).toHaveAccessibleDescription(
      'Pegá el código que te da ARCA (Formulario 960/D, opción "Banner en sitio web") o solo su enlace. La tienda muestra el logo oficial en el pie.',
    )
    const consumer = screen.getByRole('region', { name: 'Defensa del consumidor' })
    expect(within(consumer).getByText('Ley 2244 (CABA) y Ventanilla Federal Única')).toBeVisible()
    expect(
      within(consumer).getByRole('textbox', {
        name: /^Enlace de Defensa al Consumidor de la Ciudad/,
      }),
    ).toHaveValue('https://buenosaires.gob.ar/gobierno/atencion-ciudadana/defensa-al-consumidor')
    expect(
      within(consumer).getByRole('textbox', {
        name: /^Enlace del formulario nacional de reclamos/,
      }),
    ).toHaveValue('https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario')
    expect(
      within(consumer).getByText(
        'Son los enlaces oficiales y la tienda los muestra siempre en el pie. Cambialos solo si el organismo cambia la dirección.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Descuento del kit/ })).toHaveValue('10')
    expect(
      screen.getByText('De 0 a 30. Se aplica a la suma de las tres piezas.'),
    ).toBeInTheDocument()
    const home = shippingGroup('Envío a domicilio')
    expect(within(home).getByRole('switch', { name: 'Habilitado' })).toBeChecked()
    expect(within(home).getByRole('textbox', { name: /^Costo/ })).toHaveValue('$6.500')
    expect(within(home).getByRole('textbox', { name: /^Plazo/ })).toHaveAttribute(
      'placeholder',
      '3 a 6 días hábiles',
    )
    expect(within(shippingGroup('Retiro en persona')).getByText('Gratis')).toBeInTheDocument()
    expect(within(home).queryByText('Gratis')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Alícuota de IVA/ })).toHaveValue('21')
    expect(screen.getByRole('textbox', { name: /^Email de contacto/ })).toHaveValue(
      'galpon.mates@gmail.com',
    )
    expect(
      screen.getByText(
        'Estos datos se muestran en el pie, en Contacto y dentro de los textos legales. Revisalos con tu contador.',
      ),
    ).toBeInTheDocument()
  })

  it('no guarda un CUIT inválido', async () => {
    const { app, user } = await setup()

    await user.type(screen.getByRole('textbox', { name: /^CUIT/ }), '20-12345678-0')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('CUIT inválido')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^CUIT/ })).toHaveAttribute('aria-invalid', 'true')
    expect(app.mockDb.db.settings.seller.cuit).toBeNull()
  })

  it('avisa los 7 datos legales que faltan y el aviso se actualiza al guardar', async () => {
    const { user } = await setup()

    const notice = screen.getByRole('note')
    expect(within(notice).getByText('Faltan datos legales del vendedor')).toBeInTheDocument()
    expect(
      within(notice).getByText(
        'La tienda los muestra en el pie y dentro de los textos legales. Mientras falten, esos textos quedan incompletos.',
      ),
    ).toBeInTheDocument()
    expect(
      within(notice)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Razón social',
      'CUIT',
      'Condición frente al IVA',
      'Domicilio legal',
      'Área responsable',
      'Horario de atención',
      'Data Fiscal (ARCA)',
    ])
    expect(within(notice).queryByRole('link')).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /^Razón social/ }), 'Galpón Mates S. R. L.')
    await user.type(screen.getByRole('textbox', { name: /^CUIT/ }), '20-12345678-6')
    // Sin guardar, el aviso sigue con lo guardado.
    expect(within(screen.getByRole('note')).getAllByRole('listitem')).toHaveLength(7)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ajustes guardados.')).toBeInTheDocument()
    await waitFor(() => {
      expect(within(screen.getByRole('note')).getAllByRole('listitem')).toHaveLength(5)
    })
    expect(within(screen.getByRole('note')).queryByText('CUIT')).not.toBeInTheDocument()
  })

  it('el código de ARCA pegado se guarda como su enlace', async () => {
    const { app, user } = await setup()
    const dataFiscal = screen.getByRole('textbox', { name: /^Data Fiscal \(ARCA\)/ })

    await user.click(dataFiscal)
    await user.paste(
      '<a href="https://qr.afip.gob.ar/?qr=abc123" target="_F960AFIPInfo"><img src="https://www.afip.gob.ar/images/f960/DATAWEB.jpg" border="0"></a>',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ajustes guardados.')).toBeInTheDocument()
    expect(app.mockDb.db.settings.seller.dataFiscalUrl).toBe('https://qr.afip.gob.ar/?qr=abc123')
    await waitFor(() => {
      expect(dataFiscal).toHaveValue('https://qr.afip.gob.ar/?qr=abc123')
    })
  })

  it('el enlace de Defensa al Consumidor de la Ciudad es obligatorio', async () => {
    const { app, user } = await setup()
    const caba = screen.getByRole('textbox', {
      name: /^Enlace de Defensa al Consumidor de la Ciudad/,
    })

    await user.clear(caba)
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Requerido')).toBeInTheDocument()
    expect(caba).toHaveAttribute('aria-invalid', 'true')
    expect(app.mockDb.db.settings.consumerLinks.cabaUrl).toBe(
      'https://buenosaires.gob.ar/gobierno/atencion-ciudadana/defensa-al-consumidor',
    )
  })

  it('guarda el IVA con decimales, un envío gratis y el CUIT, y los vuelve a cargar', async () => {
    const { app, user, unmount } = await setup()

    await retype(user, screen.getByRole('textbox', { name: /^Alícuota de IVA/ }), '10,5')
    const homeCost = within(shippingGroup('Envío a domicilio')).getByRole('textbox', {
      name: /^Costo/,
    })
    await retype(user, homeCost, '0')
    await user.tab()
    expect(within(shippingGroup('Envío a domicilio')).getByText('Gratis')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /^CUIT/ }), '20123456786')
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ajustes guardados.')).toBeInTheDocument()
    const saved = app.mockDb.db.settings
    expect(saved.vatRatePercent).toBe(10.5)
    expect(saved.shippingOptions.find((option) => option.method === 'home')).toMatchObject({
      costArs: 0,
      label: 'Envío a domicilio',
    })
    expect(saved.seller.cuit).toBe('20123456786')
    await waitFor(() => {
      expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
    })

    unmount()
    app.queryClient.clear()
    await setup(app)
    expect(screen.getByRole('textbox', { name: /^Alícuota de IVA/ })).toHaveValue('10,5')
    expect(
      within(shippingGroup('Envío a domicilio')).getByRole('textbox', { name: /^Costo/ }),
    ).toHaveValue('$0')
    expect(screen.getByRole('textbox', { name: /^CUIT/ })).toHaveValue('20-12345678-6')
  })

  it('un 422 va a su campo y, si trae una ruta sin campo, también avisa el mensaje', async () => {
    const { app, user } = await setup()
    app.api.use({
      onRequest: ({ request }) =>
        request.method === 'PUT' && request.url.includes('/admin/settings')
          ? validationProblem(
              [
                { field: 'contactEmail', message: 'Ese email no recibe mensajes.' },
                { field: 'currency', message: 'La moneda no es válida.' },
              ],
              'Revisá los ajustes marcados.',
            )
          : undefined,
    })
    const email = screen.getByRole('textbox', { name: /^Email de contacto/ })

    await retype(user, email, 'otro@galpon.com.ar')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ese email no recibe mensajes.')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisá los ajustes marcados.')
    expect(screen.queryByText('La moneda no es válida.')).not.toBeInTheDocument()
  })

  it('"Descartar" vuelve a lo guardado', async () => {
    const { user } = await setup()
    const email = screen.getByRole('textbox', { name: /^Email de contacto/ })

    await retype(user, email, 'otro@galpon.com.ar')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(email).toHaveValue('galpon.mates@gmail.com')
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
  })

  it('si la recarga en segundo plano falla, el formulario conserva lo escrito', async () => {
    const { app, user } = await setup()
    const email = screen.getByRole('textbox', { name: /^Email de contacto/ })
    await retype(user, email, 'otro@galpon.com.ar')

    await failBackgroundReload(app)

    expect(screen.queryByText('No pudimos cargar los ajustes.')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Email de contacto/ })).toHaveValue(
      'otro@galpon.com.ar',
    )
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
  })
})
