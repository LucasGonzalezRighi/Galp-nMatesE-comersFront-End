import { act } from '@testing-library/react'
import { expect } from 'vitest'
import type { TestApp } from './render'

/**
 * Hace que la recarga en segundo plano de las consultas activas falle (la sesión vence en la API
 * simulada, así que responden `401`) y espera a que las pantallas ya se hayan enterado.
 *
 * Sirve para probar que una pantalla con datos no los cambia por el error. Falla el test si
 * ninguna consulta quedó en error con datos (la pantalla no había cargado nada todavía).
 *
 * @param app - La app del test (ver `createTestApp`), con la pantalla ya montada y cargada.
 * @example
 * await screen.findByRole('list', { name: 'Líneas' })
 * await failBackgroundReload(app)
 * expect(screen.queryByText('No pudimos cargar las líneas.')).not.toBeInTheDocument()
 */
export async function failBackgroundReload(app: TestApp): Promise<void> {
  app.mockDb.db.adminSession = null
  await act(async () => {
    await app.queryClient.refetchQueries({ type: 'active' })
    // React Query avisa a las pantallas en el próximo ciclo: se espera a que ya lo hayan hecho.
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })
  const failed = app.queryClient
    .getQueryCache()
    .findAll()
    .filter((query) => query.state.status === 'error' && query.state.data !== undefined)
  expect(failed.length).toBeGreaterThan(0)
}
