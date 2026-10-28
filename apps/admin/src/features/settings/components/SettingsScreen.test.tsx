import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
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
    for (const title of [
      'Kit',
      'Envíos',
      'Cuotas',
      'Precio sin impuestos nacionales',
      'Vendedor y atención al cliente',
      'Contacto',
      'Stock',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
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
        'Estos datos se muestran en el pie y en Contacto. Revisalos con tu contador.',
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

  it('"Descartar" vuelve a lo guardado', async () => {
    const { user } = await setup()
    const email = screen.getByRole('textbox', { name: /^Email de contacto/ })

    await retype(user, email, 'otro@galpon.com.ar')
    await user.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(email).toHaveValue('galpon.mates@gmail.com')
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
  })
})
