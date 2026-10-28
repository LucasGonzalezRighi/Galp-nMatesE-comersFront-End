import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { changeOrderStatus, getAdminOrder } from '@galpon/api-client'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { OrderScreen } from './OrderScreen'

async function renderOrder(app: TestApp, number: string) {
  const result = await renderWithApp(
    <>
      <OrderScreen number={number} />
      <Toaster />
    </>,
    { app, path: `/pedidos/${number}`, routePath: '/pedidos/$numero' },
  )
  await screen.findByRole('region', { name: 'Cliente' })
  return result
}

/** Nombres de los botones de acción del encabezado. */
function actionNames(): string[] {
  const header = screen.getByRole('banner')
  return within(header)
    .queryAllByRole('button')
    .map((button) => button.textContent)
}

/** Detalle (`dd`) de un dato de una lista, buscado por su término (`dt`). */
function detailOf(region: HTMLElement, term: string): HTMLElement {
  const dt = within(region).getByText(term, { selector: 'dt' })
  const dd = dt.nextElementSibling
  if (!(dd instanceof HTMLElement)) throw new Error(`Falta el detalle de ${term}.`)
  return dd
}

/** Middleware del cliente de la API (`api.use`). */
type ApiMiddleware = Parameters<TestApp['api']['use']>[0]

/**
 * Frena las escrituras (`POST`) de la API hasta que se llame a `release`, para ver la pantalla
 * mientras guarda.
 */
function holdWrites(app: TestApp): { release: () => void } {
  let open: () => void = () => undefined
  const held = new Promise<void>((resolve) => {
    open = resolve
  })
  const middleware: ApiMiddleware = {
    async onRequest({ request }) {
      if (request.method === 'POST') await held
    },
  }
  app.api.use(middleware)
  return {
    release: () => {
      open()
      app.api.eject(middleware)
    },
  }
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('OrderScreen', () => {
  it('muestra el encabezado, el cliente, el envío, los productos, los totales y el historial', async () => {
    const app = await createTestApp()
    await renderOrder(app, 'GLP-09001')

    expect(screen.getByRole('heading', { level: 1, name: 'Pedido GLP-09001' })).toBeInTheDocument()
    expect(screen.getByText('Creado el 27/10/2026 11:54')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('href', '/pedidos')

    const customer = screen.getByRole('region', { name: 'Cliente' })
    expect(within(customer).getByText('Lucía Pérez')).toBeInTheDocument()
    expect(within(customer).getByRole('link', { name: 'lucia.perez@example.com' })).toHaveAttribute(
      'href',
      'mailto:lucia.perez@example.com',
    )
    expect(within(customer).getByText('1145678901')).toBeInTheDocument()

    const shipping = screen.getByRole('region', { name: 'Envío' })
    expect(within(shipping).getByText('Envío a domicilio')).toBeInTheDocument()
    expect(within(shipping).getByText('Av. Corrientes 1234, 5° B')).toBeInTheDocument()

    const lines = screen.getByRole('region', { name: 'Productos' })
    expect(within(lines).getByText('Cuero Negro · Virola Alpaca cincelada')).toBeInTheDocument()
    expect(within(lines).getByText(/^2 × \$/)).toBeInTheDocument()

    const totals = screen.getByRole('region', { name: 'Totales' })
    expect(within(totals).getByText('Subtotal')).toBeInTheDocument()
    expect(within(totals).getByText('Total')).toBeInTheDocument()

    const history = screen.getByRole('region', { name: 'Historial' })
    expect(within(history).getByText('Pendiente de pago')).toBeInTheDocument()
    expect(within(history).getByText('Pagado')).toBeInTheDocument()
  })

  it('traduce el pago y enlaza el ID a Mercado Pago', async () => {
    const app = await createTestApp()
    const order = await getAdminOrder(app.api, 'GLP-09001')
    await renderOrder(app, 'GLP-09001')

    const payment = screen.getByRole('region', { name: 'Pago' })
    expect(within(detailOf(payment, 'Estado')).getByText('Aprobado')).toBeInTheDocument()
    expect(detailOf(payment, 'Detalle')).toHaveTextContent('Acreditado')
    expect(detailOf(payment, 'Medio')).toHaveTextContent('Tarjeta en la tienda · crédito')
    expect(detailOf(payment, 'Tarjeta')).toHaveTextContent('Terminada en 4242')
    expect(detailOf(payment, 'Cuotas')).toHaveTextContent('3 cuotas')
    const id = order.payment.mpPaymentId ?? ''
    expect(id).not.toBe('')
    expect(detailOf(payment, 'ID de Mercado Pago')).toHaveTextContent(id)
    expect(within(payment).getByRole('link', { name: /Ver en Mercado Pago/ })).toHaveAttribute(
      'href',
      `https://www.mercadopago.com.ar/activities?q=${id}`,
    )
    expect(within(payment).getByText('Las devoluciones se hacen desde Mercado Pago.')).toBeVisible()
  })

  it('muestra tal cual un detalle de pago que no conoce', async () => {
    const app = await createTestApp()
    await renderOrder(app, 'GLP-09010')

    const detail = detailOf(screen.getByRole('region', { name: 'Pago' }), 'Detalle')
    expect(within(detail).getByText('refunded')).toHaveClass('font-mono')
  })

  it.each([
    ['GLP-09001', ['Pasar a preparación', 'Marcar como despachado'], null],
    ['GLP-09002', ['Pasar a preparación', 'Marcar como despachado'], null],
    ['GLP-09003', ['Marcar como despachado'], null],
    ['GLP-09004', ['Marcar como entregado'], null],
    ['GLP-09005', [], 'No hay acciones para este estado.'],
    ['GLP-09006', ['Cancelar pedido'], null],
    ['GLP-09007', [], 'Hay un pago en curso: esperá a que se resuelva para cancelarlo.'],
    ['GLP-09008', [], 'No hay acciones para este estado.'],
    ['GLP-09009', [], 'No hay acciones para este estado.'],
    ['GLP-09010', [], 'No hay acciones para este estado.'],
    ['GLP-09011', [], 'No hay acciones para este estado.'],
    ['GLP-09012', ['Marcar como entregado'], null],
  ])('%s ofrece solo sus acciones', async (number, actions, message) => {
    const app = await createTestApp()
    await renderOrder(app, number)

    expect(actionNames()).toEqual(actions)
    if (message !== null) expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('mientras carga anuncia "Cargando el pedido…"', async () => {
    const app = await createTestApp()
    await renderWithApp(<OrderScreen number="GLP-09001" />, {
      app,
      path: '/pedidos/GLP-09001',
      routePath: '/pedidos/$numero',
    })

    expect(screen.getByText('Cargando el pedido…')).toHaveAttribute('role', 'status')
    await screen.findByRole('region', { name: 'Cliente' })
    expect(screen.queryByText('Cargando el pedido…')).not.toBeInTheDocument()
  })

  it('"Pasar a preparación" dice "Pasando a preparación…" mientras guarda', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderOrder(app, 'GLP-09001')
    const writes = holdWrites(app)

    await user.click(screen.getByRole('button', { name: 'Pasar a preparación' }))

    const saving = await screen.findByRole('button', { name: 'Pasando a preparación…' })
    expect(saving).toBeDisabled()
    writes.release()
    expect(await screen.findByText('El pedido pasó a preparación.')).toBeInTheDocument()
  })

  it('"Pasar a preparación" no pide confirmación y avisa', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderOrder(app, 'GLP-09001')

    await user.click(screen.getByRole('button', { name: 'Pasar a preparación' }))

    expect(await screen.findByText('El pedido pasó a preparación.')).toBeInTheDocument()
    await waitFor(() => {
      expect(actionNames()).toEqual(['Marcar como despachado'])
    })
    expect(within(screen.getByRole('banner')).getByText('En preparación')).toBeInTheDocument()
  })

  it('despachar valida la empresa y el seguimiento con los rangos del schema', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderOrder(app, 'GLP-09003')

    await user.click(screen.getByRole('button', { name: 'Marcar como despachado' }))
    const dialog = await screen.findByRole('dialog', { name: 'Despachar el pedido GLP-09003' })
    expect(within(dialog).getByRole('textbox', { name: 'Empresa de envío' })).toHaveAttribute(
      'placeholder',
      'Andreani',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Marcar como despachado' }))

    expect(await within(dialog).findAllByText('Requerido')).toHaveLength(2)

    await user.type(within(dialog).getByRole('textbox', { name: 'Empresa de envío' }), 'A')
    await user.type(within(dialog).getByRole('textbox', { name: 'Número de seguimiento' }), '123')
    await user.click(within(dialog).getByRole('button', { name: 'Marcar como despachado' }))

    expect(await within(dialog).findByText('Mínimo 2 caracteres')).toBeInTheDocument()
    expect(within(dialog).getByText('Mínimo 4 caracteres')).toBeInTheDocument()

    await user.clear(within(dialog).getByRole('textbox', { name: 'Empresa de envío' }))
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Empresa de envío' }),
      'x'.repeat(41),
    )
    await user.clear(within(dialog).getByRole('textbox', { name: 'Número de seguimiento' }))
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Número de seguimiento' }),
      '9'.repeat(41),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Marcar como despachado' }))

    expect(await within(dialog).findAllByText('Máximo 40 caracteres')).toHaveLength(2)
    expect((await getAdminOrder(app.api, 'GLP-09003')).status).toBe('preparing')
  })

  it('despacha con empresa, seguimiento y nota', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderOrder(app, 'GLP-09003')

    await user.click(screen.getByRole('button', { name: 'Marcar como despachado' }))
    const dialog = await screen.findByRole('dialog', { name: 'Despachar el pedido GLP-09003' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Empresa de envío' }), 'Andreani')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Número de seguimiento' }),
      'AND000111',
    )
    await user.type(within(dialog).getByLabelText('Nota (opcional)'), 'Sale hoy')
    await user.click(within(dialog).getByRole('button', { name: 'Marcar como despachado' }))

    expect(await screen.findByText('Pedido despachado.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    const shipping = screen.getByRole('region', { name: 'Envío' })
    expect(await within(shipping).findByText('Andreani · AND000111')).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'Historial' })
    expect(within(history).getByText('Sale hoy')).toBeVisible()
    expect(actionNames()).toEqual(['Marcar como entregado'])
  })

  it('un 409 por doble despacho avisa con el motivo y recarga el pedido', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderOrder(app, 'GLP-09003')
    await user.click(screen.getByRole('button', { name: 'Marcar como despachado' }))
    const dialog = await screen.findByRole('dialog', { name: 'Despachar el pedido GLP-09003' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Empresa de envío' }), 'Andreani')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Número de seguimiento' }),
      'AND000111',
    )
    // Otra pestaña lo despacha antes.
    await changeOrderStatus(app.api, 'GLP-09003', {
      status: 'shipped',
      carrier: 'OCA',
      trackingNumber: 'OCA999888',
      note: null,
    })

    await user.click(within(dialog).getByRole('button', { name: 'Marcar como despachado' }))

    expect(
      await screen.findByText('El pedido está despachado: no puede pasar a despachado.'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    const shipping = screen.getByRole('region', { name: 'Envío' })
    expect(await within(shipping).findByText('OCA · OCA999888')).toBeInTheDocument()
    expect(actionNames()).toEqual(['Marcar como entregado'])
  })

  it('marcar como entregado pide confirmación', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderOrder(app, 'GLP-09004')

    await user.click(screen.getByRole('button', { name: 'Marcar como entregado' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: '¿Marcar GLP-09004 como entregado?',
    })
    expect(within(dialog).getByText('Confirmá que el cliente recibió el pedido.')).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Marcar como entregado' }))

    expect(await screen.findByText('Pedido entregado.')).toBeInTheDocument()
    await waitFor(() => {
      expect(actionNames()).toEqual([])
    })
    expect((await getAdminOrder(app.api, 'GLP-09004')).status).toBe('delivered')
  })

  it('cancela GLP-09006 después de confirmar', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderOrder(app, 'GLP-09006')
    expect(screen.getByText('Reserva de stock hasta las 12:20')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: '¿Cancelar el pedido GLP-09006?',
    })
    expect(
      within(dialog).getByText(
        'Se libera el stock reservado y el pedido queda cancelado. No se puede deshacer.',
      ),
    ).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Volver' }))
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    const confirm = await screen.findByRole('alertdialog')
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar pedido' }))

    expect(await screen.findByText('Pedido cancelado.')).toBeInTheDocument()
    expect((await getAdminOrder(app.api, 'GLP-09006')).status).toBe('cancelled')
    expect(await screen.findByText('No hay acciones para este estado.')).toBeInTheDocument()
  })

  it('GLP-09007 no se puede cancelar: hay un pago en curso', async () => {
    const app = await createTestApp()
    await renderOrder(app, 'GLP-09007')

    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).not.toBeInTheDocument()
    expect(
      screen.getByText('Hay un pago en curso: esperá a que se resuelva para cancelarlo.'),
    ).toBeInTheDocument()
    const detail = detailOf(screen.getByRole('region', { name: 'Pago' }), 'Detalle')
    expect(detail).toHaveTextContent('En proceso')
  })

  it('avisa el pago duplicado de GLP-09002 que trae el resumen', async () => {
    const app = await createTestApp()
    await renderOrder(app, 'GLP-09002')

    const alert = await screen.findByText(/^Se aprobó un segundo pago de \$/)
    expect(alert.closest('[role="alert"]')).not.toBeNull()
    expect(screen.getByText('Sin dirección (retiro en persona)')).toBeInTheDocument()
  })

  it('avisa el contracargo y la mediación', async () => {
    const app = await createTestApp()
    const { unmount } = await renderOrder(app, 'GLP-09011')
    const chargedBack = screen.getByText(
      'Contracargo: el cliente desconoció el pago en su banco. Revisalo en Mercado Pago.',
    )
    expect(chargedBack.closest('[role="alert"]')).not.toBeNull()
    unmount()

    await renderOrder(app, 'GLP-09012')
    const inDispute = screen.getByText(
      'Mediación abierta en Mercado Pago: respondé desde Mercado Pago.',
    )
    expect(inDispute.closest('[role="alert"]')).not.toBeNull()
  })

  it('un pedido que no existe muestra el 404 con "Volver a pedidos"', async () => {
    const app = await createTestApp()
    await renderWithApp(<OrderScreen number="GLP-99999" />, {
      app,
      path: '/pedidos/GLP-99999',
      routePath: '/pedidos/$numero',
    })

    expect(await screen.findByText('No encontramos el pedido GLP-99999.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a pedidos' })).toHaveAttribute(
      'href',
      '/pedidos',
    )
  })

  it('un número con otro formato también es un 404, sin llamar a la API', async () => {
    const app = await createTestApp()
    await renderWithApp(<OrderScreen number="pedido-1" />, {
      app,
      path: '/pedidos/pedido-1',
      routePath: '/pedidos/$numero',
    })

    expect(screen.getByText('No encontramos el pedido pedido-1.')).toBeInTheDocument()
  })
})
