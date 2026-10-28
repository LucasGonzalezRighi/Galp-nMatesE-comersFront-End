import type { ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { getDashboardSummary } from '@galpon/api-client'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { reviewsSearchSchema } from '../reviews-search'
import { ReviewsScreen } from './ReviewsScreen'

/** Hace de ruta `/resenas`: lee la búsqueda de la URL y navega al cambiarla, con los avisos. */
function ReviewsRoute({ storeUrl }: { storeUrl: string }): ReactNode {
  const search = reviewsSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  return (
    <>
      <ReviewsScreen
        search={search}
        storeUrl={storeUrl}
        onSearchChange={(next) => void navigate({ to: '/resenas', search: next })}
      />
      <Toaster />
    </>
  )
}

/** Monta la pantalla en `path` (con la app que se pase o una nueva). */
async function setup(path = '/resenas', app?: TestApp) {
  const testApp = app ?? (await createTestApp())
  const user = userEvent.setup()
  const result = await renderWithApp(<ReviewsRoute storeUrl={testApp.context.storeUrl} />, {
    app: testApp,
    path,
    routePath: '/resenas',
  })
  return { ...result, app: testApp, user }
}

/** Espera la tarjeta de la reseña de `author`. */
async function findCard(author: string): Promise<HTMLElement> {
  const name = await screen.findByText(author)
  const card = name.closest('article')
  if (card === null) throw new Error(`No hay tarjeta para ${author}.`)
  return card
}

/** Hace que todo cambio de estado de la reseña `id` falle en el servidor (500). */
function failStatusChange(app: TestApp, id: string): void {
  const review = app.mockDb.db.reviews.find((candidate) => candidate.id === id)
  if (review === undefined) throw new Error(`No existe la reseña ${id}.`)
  const status = review.status
  Object.defineProperty(review, 'status', {
    configurable: true,
    enumerable: true,
    get: () => status,
    set: () => {
      throw new Error('Falla de prueba.')
    },
  })
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('ReviewsScreen', () => {
  it('muestra las pendientes con su contador, estrellas, producto y acciones', async () => {
    const { app } = await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Reseñas' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Solo las aprobadas se ven en la ficha y cuentan en el promedio. Las destacadas aprobadas aparecen en el inicio.',
      ),
    ).toBeInTheDocument()
    const pending = screen.getByRole('tab', { name: /Pendientes/ })
    expect(pending).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => {
      expect(pending).toHaveTextContent('4')
    })
    const card = await findCard('Rocío V.')
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(within(card).getByText('5 de 5 estrellas')).toBeInTheDocument()
    const product = within(card).getByRole('link', { name: /Mate Imperial Premium/ })
    expect(product).toHaveAttribute(
      'href',
      `${app.context.storeUrl}/producto/mate-imperial-premium`,
    )
    expect(product).toHaveAttribute('target', '_blank')
    expect(within(card).getByText('27/10/2026')).toBeInTheDocument()
    expect(
      within(card).getByText(
        'Llegó impecable y bien embalado. La virola es todavía más linda en persona.',
      ),
    ).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Aprobar' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Ocultar' })).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Destacar en el inicio' })).toBeNull()
  })

  it('cambiar de pestaña lleva el estado a la URL y vuelve a la primera página', async () => {
    const { router, user } = await setup('/resenas?pagina=1')
    await findCard('Rocío V.')

    await user.click(screen.getByRole('tab', { name: 'Ocultas' }))

    expect(router.state.location.search).toEqual({ estado: 'ocultas', pagina: 1 })
    const card = await findCard('Ofertas Ya')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(within(card).getByRole('button', { name: 'Aprobar' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Volver a pendientes' })).toBeInTheDocument()
  })

  it('un estado desconocido en la URL muestra las pendientes', async () => {
    await setup('/resenas?estado=borradas')

    expect(screen.getByRole('tab', { name: /Pendientes/ })).toHaveAttribute('aria-selected', 'true')
    expect(await findCard('Rocío V.')).toBeInTheDocument()
  })

  it('aprobar saca la reseña de pendientes, avisa y baja el contador', async () => {
    const { app, user } = await setup()
    const card = await findCard('Rocío V.')

    await user.click(within(card).getByRole('button', { name: 'Aprobar' }))

    expect(screen.queryByText('Rocío V.')).toBeNull()
    expect(await screen.findByRole('status')).toHaveTextContent('Reseña aprobada.')
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Pendientes/ })).toHaveTextContent('3')
    })
    expect(app.mockDb.db.reviews.find((review) => review.id === 'rev-demo-1')?.status).toBe(
      'approved',
    )
    expect((await getDashboardSummary(app.api)).pendingReviews).toBe(3)
  })

  it('"Destacar en el inicio" solo aparece en las aprobadas y marca la reseña', async () => {
    const { app, user } = await setup('/resenas?estado=aprobadas')
    const featured = await findCard('Martina R.')
    expect(within(featured).getByText('Destacada')).toBeInTheDocument()
    expect(within(featured).getByText('Compra verificada')).toBeInTheDocument()
    expect(
      within(featured).getByRole('button', { name: 'Quitar de destacadas' }),
    ).toBeInTheDocument()
    const card = await findCard('Joaquín P.')

    await user.click(within(card).getByRole('button', { name: 'Destacar en el inicio' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Reseña destacada en el inicio.')
    expect(within(card).getByText('Destacada')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Quitar de destacadas' })).toBeInTheDocument()
    expect(
      app.mockDb.db.reviews.find((review) => review.id === 'rev-imperial-premium-2')?.featured,
    ).toBe(true)
  })

  it('volver a pendientes avisa y la reseña sale de las ocultas', async () => {
    const { app, user } = await setup('/resenas?estado=ocultas')
    const card = await findCard('Ofertas Ya')

    await user.click(within(card).getByRole('button', { name: 'Volver a pendientes' }))

    expect(await screen.findByRole('status')).toHaveTextContent('La reseña volvió a pendientes.')
    expect(await screen.findByText('No hay reseñas ocultas.')).toBeInTheDocument()
    expect(app.mockDb.db.reviews.find((review) => review.id === 'rev-demo-5')?.status).toBe(
      'pending',
    )
  })

  it('si el cambio falla, la reseña vuelve a su pestaña y avisa con un error', async () => {
    const app = await createTestApp()
    failStatusChange(app, 'rev-demo-1')
    const { user } = await setup('/resenas', app)
    const card = await findCard('Rocío V.')

    await user.click(within(card).getByRole('button', { name: 'Ocultar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falla de prueba.')
    expect(await findCard('Rocío V.')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('tab', { name: /Pendientes/ })).toHaveTextContent('4')
  })

  it('sin reseñas en la pestaña muestra el vacío con un atajo a otra', async () => {
    const app = await createTestApp()
    app.mockDb.db.reviews = app.mockDb.db.reviews.filter((review) => review.status !== 'pending')
    const { router, user } = await setup('/resenas', app)

    expect(await screen.findByText('No hay reseñas para moderar.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver aprobadas' }))

    expect(router.state.location.search).toEqual({ estado: 'aprobadas', pagina: 1 })
  })

  it('si la carga falla muestra el error con "Reintentar"', async () => {
    const app = await createTestApp()
    app.mockDb.db.adminSession = null
    await setup('/resenas', app)

    const error = await screen.findByRole('alert')
    expect(error).toHaveTextContent('No pudimos cargar las reseñas.')
    expect(within(error).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
