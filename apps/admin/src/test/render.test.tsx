import { Link, useParams, useRouteContext } from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getAdminSession } from '@galpon/api-client'
import { adminCsrfQuery, useApiClient } from '@galpon/api-client/react'
import { createTestApp, renderWithApp, TEST_NOW } from './render'

describe('createTestApp', () => {
  it('por omisión deja la sesión iniciada, el token puesto y la demostración sembrada', async () => {
    const app = await createTestApp()

    expect(app.session?.email).toBe('admin@galponmates.com.ar')
    await expect(getAdminSession(app.api)).resolves.toMatchObject({ email: app.session?.email })
    expect(app.queryClient.getQueryData(adminCsrfQuery(app.api).queryKey)).toBeDefined()
    expect(app.mockDb.db.orders).toHaveLength(12)
    expect(app.context.apiMode).toBe('mock')
    expect(app.context.registerMockImage).not.toBeNull()
  })

  it('con loggedIn y demo en false no hay sesión ni pedidos', async () => {
    const app = await createTestApp({ loggedIn: false, demo: false })

    expect(app.session).toBeNull()
    await expect(getAdminSession(app.api)).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(app.mockDb.db.orders).toHaveLength(0)
  })
})

describe('renderWithApp', () => {
  it('muestra la pantalla en path y los Link navegan dentro del router en memoria', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    const { router } = await renderWithApp(<Link to="/productos">Ver productos</Link>, {
      app,
      path: '/',
    })

    await user.click(screen.getByRole('link', { name: 'Ver productos' }))

    expect(await screen.findByText('Ruta de prueba: /productos')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/productos')
  })

  it('da el contexto del router, la sesión y el cliente de la API a la pantalla', async () => {
    const app = await createTestApp()
    function Screen() {
      const context = useRouteContext({ strict: false })
      const api = useApiClient()
      return (
        <p>
          {`${context.storeUrl ?? '?'} · ${context.session?.email ?? 'sin sesión'} · ${String(api === app.api)}`}
        </p>
      )
    }

    await renderWithApp(<Screen />, { app })

    expect(
      screen.getByText('http://localhost:3000 · admin@galponmates.com.ar · true'),
    ).toBeInTheDocument()
  })

  it('con routePath la pantalla lee los parámetros de la dirección', async () => {
    const app = await createTestApp({ loggedIn: false })
    function Screen() {
      const params = useParams({ strict: false })
      return <p>{`Pedido ${params.numero ?? '?'}`}</p>
    }

    await renderWithApp(<Screen />, {
      app,
      path: '/pedidos/GLP-09001',
      routePath: '/pedidos/$numero',
    })

    await waitFor(() => {
      expect(screen.getByText('Pedido GLP-09001')).toBeInTheDocument()
    })
  })

  it('el reloj de la API es fijo salvo que el test pase otro', async () => {
    const app = await createTestApp()

    const [order] = app.mockDb.db.orders
    expect(order).toBeDefined()
    expect(Date.parse(order?.createdAt ?? '')).toBeLessThanOrEqual(TEST_NOW.getTime())
  })
})
