import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Route } from '../routes/__root'
import { createTestApp, renderWithApp } from '../test/render'

const { notFoundComponent: NotFound, errorComponent: RouteError } = Route.options

describe('ruta raíz', () => {
  it('el 404 tiene su h1 y su document.title', async () => {
    if (NotFound === undefined) throw new Error('Falta el 404 de la ruta raíz.')
    const app = await createTestApp()
    await renderWithApp(<NotFound isNotFound routeId="__root__" />, { app, path: '/no-existe' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeInTheDocument()
    expect(document.title).toBe('No encontramos esa página · Galpón Admin')
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/')
  })

  it('la pantalla de error tiene su h1 y su document.title', async () => {
    if (RouteError === undefined || RouteError === null || RouteError === false) {
      throw new Error('Falta la pantalla de error de la ruta raíz.')
    }
    const app = await createTestApp()
    await renderWithApp(
      <RouteError error={new Error('Falla de prueba.')} reset={() => undefined} />,
      {
        app,
        path: '/',
      },
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Algo salió mal' })).toBeInTheDocument()
    expect(document.title).toBe('Algo salió mal · Galpón Admin')
    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
  })
})
