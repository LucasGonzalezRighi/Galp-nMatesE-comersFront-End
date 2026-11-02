import { useNavigate, useSearch } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { adminLogout } from '@galpon/api-client'
import type { TestApp } from '../../../test/render'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { ordersSearchSchema } from '../orders-search'
import { useOrdersSearchStore } from '../orders-search.store'
import { OrdersScreen } from './OrdersScreen'

/** La ruta `/pedidos` del test: valida la búsqueda como la ruta real y navega con los filtros. */
function OrdersRoute() {
  const search = ordersSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  return (
    <>
      <OrdersScreen
        search={search}
        onSearchChange={(next) => {
          void navigate({ to: '/pedidos', search: next })
        }}
        storeUrl="http://localhost:3000"
      />
      <Toaster />
    </>
  )
}

async function renderOrders(app: TestApp, path = '/pedidos') {
  return renderWithApp(<OrdersRoute />, { app, path, routePath: '/pedidos' })
}

/** Números de pedido de las filas de la tabla, en orden. */
function rowNumbers(): string[] {
  const table = screen.getByRole('table', { name: 'Pedidos' })
  return within(table)
    .queryAllByRole('link')
    .map((link) => link.textContent)
}

beforeEach(() => {
  useOrdersSearchStore.setState({ text: '' })
})

describe('OrdersScreen', () => {
  it('lista los pedidos de la demostración con sus columnas', async () => {
    const app = await createTestApp()
    await renderOrders(app)

    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'GLP-09001' })).toBeInTheDocument()
    expect(rowNumbers()).toHaveLength(12)
    const table = screen.getByRole('table', { name: 'Pedidos' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Número', 'Fecha', 'Cliente', 'Total', 'Pedido', 'Pago', 'Envío'])
    const row = screen.getByRole('link', { name: 'GLP-09001' }).closest('tr')
    if (row === null) throw new Error('Falta la fila de GLP-09001.')
    expect(within(row).getByText('27/10/2026 11:54')).toBeInTheDocument()
    expect(within(row).getByText('Lucía Pérez')).toBeInTheDocument()
    expect(within(row).getByText('lucia.perez@example.com')).toBeInTheDocument()
    expect(within(row).getByText('Pagado')).toBeInTheDocument()
    expect(within(row).getByText('Aprobado')).toBeInTheDocument()
    expect(within(row).getByText('Envío a domicilio')).toBeInTheDocument()
  })

  it('los filtros de estado y pago van a la URL y vuelven a la primera página', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    const { router } = await renderOrders(app, '/pedidos?pagina=2')

    await user.selectOptions(screen.getByLabelText('Estado del pedido'), 'shipped')

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ estado: 'shipped' })
    })
    await waitFor(() => {
      expect(rowNumbers()).toEqual(['GLP-09004', 'GLP-09012'])
    })

    await user.selectOptions(screen.getByLabelText('Estado del pago'), 'in_dispute')

    await waitFor(() => {
      expect(rowNumbers()).toEqual(['GLP-09012'])
    })
    expect(router.state.location.search).toEqual({ estado: 'shipped', pago: 'in_dispute' })
  })

  it('"Para despachar" pide los pedidos pagados y en preparación', async () => {
    const app = await createTestApp()
    await renderOrders(app, '/pedidos?estado=para-despachar')

    expect(screen.getByLabelText('Estado del pedido')).toHaveValue('para-despachar')
    await waitFor(() => {
      expect(rowNumbers()).toEqual(['GLP-09001', 'GLP-09002', 'GLP-09003'])
    })
  })

  it('la búsqueda no va a la URL y sobrevive a ir al detalle y volver', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    const { router, unmount } = await renderOrders(app)
    await screen.findByRole('link', { name: 'GLP-09001' })

    await user.type(screen.getByLabelText('Buscar'), 'lucia')

    await waitFor(() => {
      expect(rowNumbers()).toEqual(['GLP-09001'])
    })
    expect(router.state.location.href).toBe('/pedidos')

    await user.click(screen.getByRole('link', { name: 'GLP-09001' }))
    expect(await screen.findByText('Ruta de prueba: /pedidos/GLP-09001')).toBeInTheDocument()
    unmount()

    await renderOrders(app)

    expect(screen.getByLabelText('Buscar')).toHaveValue('lucia')
    await waitFor(() => {
      expect(rowNumbers()).toEqual(['GLP-09001'])
    })
  })

  it('sin resultados ofrece limpiar los filtros, que borra también la búsqueda', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    const { router } = await renderOrders(app, '/pedidos?estado=delivered')
    await user.type(screen.getByLabelText('Buscar'), 'nadie')

    expect(await screen.findByText('Ningún pedido coincide con la búsqueda.')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Pedidos' })
    await user.click(within(table).getByRole('button', { name: 'Limpiar filtros' }))

    await waitFor(() => {
      expect(rowNumbers()).toHaveLength(12)
    })
    expect(screen.getByLabelText('Buscar')).toHaveValue('')
    expect(screen.getByLabelText('Estado del pedido')).toHaveValue('')
    expect(router.state.location.search).toEqual({})
  })

  it('sin pedidos dice que todavía no hay', async () => {
    const app = await createTestApp({ demo: false })
    await renderOrders(app)

    expect(await screen.findByText('Todavía no hay pedidos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver tienda' })).toHaveAttribute(
      'href',
      'http://localhost:3000',
    )
  })

  it('si la API falla muestra el error y "Reintentar"', async () => {
    const app = await createTestApp()
    // Sin sesión, la API responde 401 (el diálogo de re-ingreso lo maneja la estructura).
    await adminLogout(app.api)
    await renderOrders(app)

    expect(await screen.findByText('No pudimos cargar los pedidos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
