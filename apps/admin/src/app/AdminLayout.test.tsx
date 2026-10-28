import type { ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { queryKeys } from '@galpon/api-client/react'
import type { TestApp } from '../test/render'
import { PageHeader } from '../components/ui/PageHeader'
import { toast } from '../components/ui/toast'
import { Toaster } from '../components/ui/Toaster'
import { UnsavedChangesGuard } from '../components/ui/UnsavedChangesGuard'
import { useSessionExpiredStore } from '../features/auth'
import { renderWithApp } from '../test/render'
import { createAdminTestApp } from './admin-test-app.test-helper'
import { AdminLayout } from './AdminLayout'

const NOT_PERSISTENT = 'Sin persistencia: los cambios se pierden al recargar.'

/** Pantalla de prueba con un `h1` que dice en qué ruta está. */
function Heading() {
  const pathname = useLocation({ select: (location) => location.pathname })
  return <PageHeader title={`Pantalla ${pathname}`} />
}

interface RenderLayoutOptions {
  app?: TestApp
  path?: string
  routePath?: string
  children?: ReactNode
}

/** Dibuja la estructura con una pantalla adentro y el `Toaster`. */
async function renderLayout(options: RenderLayoutOptions = {}) {
  const app = options.app ?? (await createAdminTestApp())
  const user = userEvent.setup()
  const result = await renderWithApp(
    <>
      <AdminLayout context={app.context} email="admin@galponmates.com.ar">
        {options.children ?? <Heading />}
      </AdminLayout>
      <Toaster />
    </>,
    {
      app,
      path: options.path ?? '/',
      ...(options.routePath === undefined ? {} : { routePath: options.routePath }),
    },
  )
  return { app, user, ...result }
}

beforeEach(() => {
  useSessionExpiredStore.setState({ hasSession: false, isExpired: false })
  toast.dismissAll()
})

describe('AdminLayout: barra lateral', () => {
  it('marca la sección activa y nombra los contadores del resumen', async () => {
    await renderLayout({ path: '/pedidos/GLP-09001', routePath: '/pedidos/$numero' })
    const nav = screen.getByRole('navigation', { name: 'Principal' })

    const orders = await within(nav).findByRole('link', { name: 'Pedidos, 3 para despachar' })
    expect(orders).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Reseñas, 4 pendientes' })).not.toHaveAttribute(
      'aria-current',
    )
    expect(within(nav).getByRole('link', { name: 'Mensajes, 3 sin leer' })).toHaveAttribute(
      'href',
      '/mensajes',
    )
    expect(within(nav).getByRole('link', { name: 'Resumen' })).not.toHaveAttribute('aria-current')
  })

  it('Contenido queda activo en cualquier pantalla de contenido', async () => {
    await renderLayout({ path: '/contenido/legales' })
    const content = within(screen.getByRole('navigation', { name: 'Principal' })).getByRole(
      'link',
      { name: 'Contenido' },
    )

    expect(content).toHaveAttribute('aria-current', 'page')
    expect(content).toHaveAttribute('href', '/contenido/inicio')
  })

  it('no muestra los contadores en 0', async () => {
    const app = await createAdminTestApp({ demo: false })
    await renderLayout({ app })

    await waitFor(() => {
      expect(app.queryClient.getQueryState(queryKeys.adminDashboard())?.status).toBe('success')
    })
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Pedidos' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Mensajes' })).toBeInTheDocument()
  })

  it('en modo de prueba avisa "Sin persistencia" y lo vuelve a leer después de cada escritura', async () => {
    let persistent = true
    const app = await createAdminTestApp()
    app.context = {
      ...app.context,
      mockStatus: {
        get isPersistent() {
          return persistent
        },
      },
    }
    function Writer() {
      const write = useMutation({
        mutationFn: () => {
          persistent = false
          return Promise.resolve()
        },
      })
      return (
        <button
          type="button"
          onClick={() => {
            write.mutate()
          }}
        >
          Escribir
        </button>
      )
    }
    const { user } = await renderLayout({ app, children: <Writer /> })

    expect(screen.getAllByText('Modo de prueba').length).toBeGreaterThan(0)
    expect(screen.queryByText(NOT_PERSISTENT)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Escribir' }))
    expect(await screen.findByText(NOT_PERSISTENT)).toBeInTheDocument()
  })

  it('enlaza la tienda en otra pestaña y Mi cuenta', async () => {
    const { app } = await renderLayout()

    const store = screen.getByRole('link', { name: 'Ver tienda' })
    expect(store).toHaveAttribute('href', app.context.storeUrl)
    expect(store).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta')
    expect(screen.getByText('admin@galponmates.com.ar')).toBeInTheDocument()
  })

  it('Cerrar sesión cierra la sesión y vuelve a /login', async () => {
    const { app, user } = await renderLayout()

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByText('Ruta de prueba: /login')).toBeInTheDocument()
    expect(app.mockDb.db.adminSession).toBeNull()
    expect(useSessionExpiredStore.getState().hasSession).toBe(false)
  })

  it('si cerrar la sesión falla, avisa y se queda', async () => {
    const { app, user } = await renderLayout()
    app.context.setCsrfToken('token-viejo')

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(
      await screen.findByText('No pudimos cerrar la sesión, probá de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pantalla /' })).toBeInTheDocument()
  })
})

describe('AdminLayout: estructura', () => {
  it('tiene el enlace para saltar al contenido', async () => {
    await renderLayout()

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido')
  })

  it('el cajón del celular abre el menú, se cierra al navegar y el foco va al título', async () => {
    const { router, user } = await renderLayout({ path: '/cuenta', routePath: '/$section' })

    await user.click(screen.getByRole('button', { name: 'Menú' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menú' })
    await user.click(within(drawer).getByRole('link', { name: /^Pedidos/ }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe('/pedidos')
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Pantalla /pedidos' })).toHaveFocus()
    })
  })

  it('si el enlace es el de la sección actual, el foco vuelve a "Menú" y no se pierde', async () => {
    const { router, user } = await renderLayout({ path: '/pedidos', routePath: '/$section' })

    await user.click(screen.getByRole('button', { name: 'Menú' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menú' })
    await user.click(within(drawer).getByRole('link', { name: /^Pedidos/ }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe('/pedidos')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Menú' })).toHaveFocus()
    })
  })

  it('si UnsavedChangesGuard frena la navegación, el foco no queda en el body', async () => {
    const { router, user } = await renderLayout({
      path: '/cuenta',
      routePath: '/$section',
      children: (
        <>
          <Heading />
          <UnsavedChangesGuard when />
        </>
      ),
    })

    await user.click(screen.getByRole('button', { name: 'Menú' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menú' })
    await user.click(within(drawer).getByRole('link', { name: /^Pedidos/ }))
    const guard = await screen.findByRole('alertdialog', { name: '¿Salir sin guardar?' })
    await user.click(within(guard).getByRole('button', { name: 'Seguir editando' }))

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(router.state.location.pathname).toBe('/cuenta')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Menú' })).toHaveFocus()
    })
  })

  it('"Cerrar menú" cierra el cajón', async () => {
    const { user } = await renderLayout()

    await user.click(screen.getByRole('button', { name: 'Menú' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menú' })
    await user.click(within(drawer).getByRole('button', { name: 'Cerrar menú' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument()
    })
  })
})
