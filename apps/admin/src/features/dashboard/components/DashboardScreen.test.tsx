import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDashboardSummary } from '@galpon/api-client'
import { formatPesos, pesos } from '@galpon/domain'
import type { TestApp } from '../../../test/render'
import { createTestApp, renderWithApp, TEST_NOW } from '../../../test/render'
import { DashboardScreen } from './DashboardScreen'

const MOCK_NOTE =
  'Estás en modo de prueba: los datos son de ejemplo y los cambios quedan solo en esta pestaña. La tienda no los ve hasta que exista el back.'

/** Dibuja el resumen en `/` contra la API de prueba (con los datos de demostración, por omisión). */
async function setup(app?: TestApp, isMockMode = true) {
  const testApp = app ?? (await createTestApp())
  await renderWithApp(<DashboardScreen isMockMode={isMockMode} today={TEST_NOW} />, {
    app: testApp,
    path: '/',
  })
  return { app: testApp, user: userEvent.setup() }
}

describe('DashboardScreen', () => {
  it('muestra el título, la fecha con mayúscula y la nota del modo de prueba', async () => {
    await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByText('Martes 27 de octubre')).toBeInTheDocument()
    expect(screen.getByText(MOCK_NOTE)).toBeInTheDocument()
    expect(document.title).toBe('Resumen · Galpón Admin')
  })

  it('mientras carga lo anuncia y los títulos no saltan niveles', async () => {
    await setup()

    expect(screen.getByText('Cargando el resumen…')).toHaveAttribute('role', 'status')
    await screen.findByRole('region', { name: 'Para despachar' })
    expect(screen.getByRole('heading', { level: 2, name: 'Ventas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Para atender' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Ventas de hoy' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Para despachar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Poco stock' })).toBeInTheDocument()
  })

  it('en vivo no muestra la nota del modo de prueba', async () => {
    await setup(undefined, false)

    expect(screen.queryByText(MOCK_NOTE)).not.toBeInTheDocument()
  })

  it('con los datos de demostración muestra las ventas y los pendientes con sus enlaces', async () => {
    const { app } = await setup()
    const summary = await getDashboardSummary(app.api)

    const today = await screen.findByRole('region', { name: 'Ventas de hoy' })
    expect(today).toHaveTextContent(formatPesos(pesos(summary.salesTodayArs)))
    expect(screen.getByRole('region', { name: 'Últimos 7 días' })).toHaveTextContent(
      formatPesos(pesos(summary.salesLast7DaysArs)),
    )

    const toShip = screen.getByRole('region', { name: 'Para despachar' })
    expect(within(toShip).getByText('3')).toBeInTheDocument()
    expect(within(toShip).getByText('Pagados o en preparación')).toBeInTheDocument()
    expect(within(toShip).getByRole('link', { name: 'Ver pedidos' })).toHaveAttribute(
      'href',
      '/pedidos?estado=para-despachar',
    )
    const reviews = screen.getByRole('region', { name: 'Reseñas pendientes' })
    expect(within(reviews).getByText('4')).toBeInTheDocument()
    // El router del test no tiene las rutas reales: ahí `stripSearchParams` saca los valores por
    // omisión y quedan `/resenas` y `/mensajes?sinLeer=1`.
    expect(within(reviews).getByRole('link', { name: 'Moderar' })).toHaveAttribute(
      'href',
      '/resenas?estado=pendientes&pagina=1',
    )
    const messages = screen.getByRole('region', { name: 'Mensajes sin leer' })
    expect(within(messages).getByText('3')).toBeInTheDocument()
    expect(within(messages).getByRole('link', { name: 'Leer' })).toHaveAttribute(
      'href',
      '/mensajes?sinLeer=1&pagina=1',
    )
  })

  it('lista las tres alertas de pago con su tipo y el enlace al pedido', async () => {
    await setup()

    const alerts = await screen.findByRole('region', { name: 'Alertas de pago' })
    expect(within(alerts).getAllByRole('listitem')).toHaveLength(3)
    expect(within(alerts).getByText('Pago duplicado')).toBeInTheDocument()
    expect(within(alerts).getByText('Mediación')).toBeInTheDocument()
    expect(within(alerts).getByText('Contracargo')).toBeInTheDocument()
    expect(within(alerts).getByRole('link', { name: 'Ver pedido GLP-09002' })).toHaveAttribute(
      'href',
      '/pedidos/GLP-09002',
    )
  })

  it('lista los dos productos con poco stock y el umbral de los ajustes', async () => {
    await setup()

    const lowStock = await screen.findByRole('region', { name: 'Poco stock' })
    expect(
      within(lowStock).getByText(
        'Productos publicados con 3 unidades o menos (se cambia en Ajustes).',
      ),
    ).toBeInTheDocument()
    const items = within(lowStock).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Mate Galleta')
    expect(items[0]).toHaveTextContent('Sin stock')
    expect(items[1]).toHaveTextContent('Mate Coquito Criollo')
    expect(items[1]).toHaveTextContent('Quedan 2')
    expect(within(lowStock).getByRole('link', { name: 'Editar Mate Galleta' })).toHaveAttribute(
      'href',
      '/productos/prd-galleta',
    )
  })

  it('sin alertas ni poco stock lo dice', async () => {
    const app = await createTestApp({ demo: false })
    for (const product of app.mockDb.db.products) product.stock = 50
    await setup(app)

    expect(await screen.findByText('No hay alertas de pago.')).toBeInTheDocument()
    expect(screen.getByText('Ningún producto publicado tiene poco stock.')).toBeInTheDocument()
  })

  it('si falla muestra el error y "Reintentar" vuelve a cargar', async () => {
    const app = await createTestApp()
    const session = app.mockDb.db.adminSession
    app.mockDb.db.adminSession = null
    const { user } = await setup(app)

    expect(await screen.findByText('No pudimos cargar el resumen.')).toBeInTheDocument()
    app.mockDb.db.adminSession = session
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('region', { name: 'Para despachar' })).toBeInTheDocument()
  })
})

describe('DashboardScreen: la fecha de hoy', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sin `today` se vuelve a calcular cada minuto y al volver a la pestaña', async () => {
    // Solo el reloj y el intervalo son falsos: la API simulada y el router siguen con los reales.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(TEST_NOW)
    const app = await createTestApp()
    await renderWithApp(<DashboardScreen isMockMode />, { app, path: '/' })
    expect(screen.getByText('Martes 27 de octubre')).toBeInTheDocument()

    // Pasa la medianoche de Buenos Aires: al minuto siguiente cambia la fecha.
    vi.setSystemTime(new Date('2026-10-28T03:00:30Z'))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByText('Miércoles 28 de octubre')).toBeInTheDocument()

    // Con la pestaña en segundo plano el intervalo puede no correr: al volver se recalcula.
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByText('Jueves 29 de octubre')).toBeInTheDocument()
  })
})
