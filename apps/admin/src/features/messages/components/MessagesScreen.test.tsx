import type { ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { getDashboardSummary } from '@galpon/api-client'
import { adminDashboardQuery, queryKeys } from '@galpon/api-client/react'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { messagesSearchSchema } from '../messages-search'
import { MessagesScreen } from './MessagesScreen'

/** Hace de ruta `/mensajes`: lee la búsqueda de la URL y navega al cambiarla, con los avisos. */
function MessagesRoute(): ReactNode {
  const search = messagesSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  return (
    <>
      <MessagesScreen
        search={search}
        onSearchChange={(next) => void navigate({ to: '/mensajes', search: next })}
      />
      <Toaster />
    </>
  )
}

/** Monta la pantalla en `path` (con la app que se pase o una nueva). */
async function setup(path = '/mensajes', app?: TestApp) {
  const testApp = app ?? (await createTestApp())
  const user = userEvent.setup()
  const result = await renderWithApp(<MessagesRoute />, {
    app: testApp,
    path,
    routePath: '/mensajes',
  })
  return { ...result, app: testApp, user }
}

/** Espera el botón que despliega el mensaje cuyo resumen coincide con `name`. */
function findMessage(name: RegExp): Promise<HTMLElement> {
  return screen.findByRole('button', { name })
}

/** Los renglones de la lista de mensajes. */
function listItems(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Mensajes' })).getAllByRole('listitem')
}

/** El mensaje `id` de la base simulada. */
function messageInDb(app: TestApp, id: string) {
  return app.mockDb.db.messages.find((message) => message.id === id)
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('MessagesScreen', () => {
  it('lista los mensajes con su tipo, motivo o código, pedido y fecha', async () => {
    await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Mensajes' })).toBeInTheDocument()
    const contact = await findMessage(/Martín Gómez/)
    expect(listItems()).toHaveLength(8)
    expect(contact).toHaveAttribute('aria-expanded', 'false')
    expect(contact).toHaveTextContent('Sin leer')
    expect(contact).toHaveTextContent('Contacto')
    expect(contact).toHaveTextContent('Pedido GLP-09002')
    expect(contact).toHaveTextContent('27/10/2026 11:30')
    const withdrawal = await findMessage(/Sofía Martínez.*Arrepentimiento/)
    expect(withdrawal).toHaveTextContent('Código ARR-000003')
    const read = await findMessage(/Ramiro Benítez/)
    expect(read).not.toHaveTextContent('Sin leer')
    expect(read).toHaveTextContent('Otro')
  })

  it('las pestañas y "Solo sin leer" van a la URL y filtran', async () => {
    const { router, user } = await setup()
    await findMessage(/Martín Gómez/)

    await user.click(screen.getByRole('tab', { name: 'Arrepentimientos' }))

    expect(router.state.location.search).toEqual({ tipo: 'arrepentimiento', pagina: 1 })
    expect(await findMessage(/Federico Álvarez/)).toBeInTheDocument()
    expect(listItems()).toHaveLength(3)

    await user.click(screen.getByRole('checkbox', { name: 'Solo sin leer' }))

    expect(router.state.location.search).toEqual({
      tipo: 'arrepentimiento',
      sinLeer: 1,
      pagina: 1,
    })
    await waitFor(() => {
      expect(listItems()).toHaveLength(1)
    })
    expect(screen.getByRole('checkbox', { name: 'Solo sin leer' })).toBeChecked()

    await user.click(screen.getByRole('tab', { name: 'Todos' }))

    expect(router.state.location.search).toEqual({ sinLeer: 1, pagina: 1 })
    await waitFor(() => {
      expect(listItems()).toHaveLength(3)
    })
  })

  it('desplegar uno sin leer lo marca leído y baja unreadMessages', async () => {
    const app = await createTestApp()
    await app.queryClient.query(adminDashboardQuery(app.api))
    const { user } = await setup('/mensajes', app)
    const message = await findMessage(/Martín Gómez/)

    await user.click(message)

    expect(message).toHaveAttribute('aria-expanded', 'true')
    expect(message).not.toHaveTextContent('Sin leer')
    expect(
      screen.getByText('Creo que me cobraron dos veces el kit. ¿Lo pueden revisar?'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(messageInDb(app, 'msg-0008')?.read).toBe(true)
    })
    expect(
      app.queryClient.getQueryData<{ unreadMessages: number }>(queryKeys.adminDashboard())
        ?.unreadMessages,
    ).toBe(2)
    expect((await getDashboardSummary(app.api)).unreadMessages).toBe(2)
  })

  it('"Marcar como no leído" lo vuelve a sin leer, lo pliega y avisa', async () => {
    const { app, user } = await setup()
    const message = await findMessage(/Ramiro Benítez/)
    await user.click(message)

    await user.click(screen.getByRole('button', { name: 'Marcar como no leído' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Mensaje marcado como no leído.')
    expect(message).toHaveAttribute('aria-expanded', 'false')
    expect(message).toHaveTextContent('Sin leer')
    expect(message).toHaveFocus()
    expect(messageInDb(app, 'msg-0004')?.read).toBe(false)
  })

  it('"Responder por email" lleva el asunto y "Ver pedido" va al pedido', async () => {
    const { router, user } = await setup()
    await user.click(await findMessage(/Carla Fernández/))

    expect(screen.getByRole('link', { name: 'Responder por email' })).toHaveAttribute(
      'href',
      'mailto:carla.fernandez@example.com?subject=Tu%20consulta%20a%20Galp%C3%B3n%20Mates',
    )
    await user.click(await findMessage(/Sofía Martínez.*Arrepentimiento/))

    expect(screen.getByText('Sin comentario.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Responder por email' })).toHaveAttribute(
      'href',
      'mailto:sofia.martinez@example.com?subject=Tu%20solicitud%20de%20arrepentimiento%20ARR-000003',
    )

    await user.click(screen.getByRole('link', { name: 'Ver pedido GLP-09005' }))

    expect(await screen.findByText('Ruta de prueba: /pedidos/GLP-09005')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pedidos/GLP-09005')
  })

  it('sin mensajes con los filtros ofrece limpiarlos', async () => {
    const app = await createTestApp()
    for (const message of app.mockDb.db.messages) message.read = true
    const { router, user } = await setup('/mensajes?tipo=contacto&sinLeer=1', app)

    expect(await screen.findByText('No hay mensajes con estos filtros.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(router.state.location.search).toEqual({ pagina: 1 })
    expect(await findMessage(/Martín Gómez/)).toBeInTheDocument()
  })

  it('sin mensajes muestra el vacío', async () => {
    const app = await createTestApp()
    app.mockDb.db.messages = []
    await setup('/mensajes', app)

    expect(await screen.findByText('No hay mensajes.')).toBeInTheDocument()
  })

  it('si la carga falla muestra el error con "Reintentar"', async () => {
    const app = await createTestApp()
    app.mockDb.db.adminSession = null
    await setup('/mensajes', app)

    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('No pudimos cargar los mensajes.')
    expect(within(error).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
