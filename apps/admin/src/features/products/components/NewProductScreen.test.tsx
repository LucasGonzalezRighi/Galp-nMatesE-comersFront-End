import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ImageUploaderProvider } from '../../../components/media/ImageUploaderProvider'
import { createSimulatedUploader } from '../../../components/media/simulated-uploader'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { NewProductScreen } from './NewProductScreen'

/** Monta `/productos/nuevo` con el uploader simulado y los avisos. */
async function setup() {
  const app = await createTestApp()
  const { registerMockImage } = app.context
  if (registerMockImage === null) {
    throw new Error('La app del test tiene que estar en modo de prueba.')
  }
  const uploader = createSimulatedUploader({ api: app.api, registerMockImage, durationMs: 0 })
  const user = userEvent.setup()
  const result = await renderWithApp(
    <ImageUploaderProvider uploader={uploader}>
      <NewProductScreen />
      <Toaster />
    </ImageUploaderProvider>,
    { app, path: '/productos/nuevo' },
  )
  return { ...result, app, user }
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('NewProductScreen', () => {
  it('el slug sigue al nombre hasta que se lo toca a mano', async () => {
    const { user } = await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo producto' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Nombre/), 'Mate Ñandú Único')
    expect(screen.getByLabelText(/^Slug/)).toHaveValue('mate-nandu-unico')
    expect(
      screen.getByText('Dirección en la tienda: /producto/mate-nandu-unico'),
    ).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/^Slug/))
    await user.type(screen.getByLabelText(/^Slug/), 'mi-mate')
    await user.type(screen.getByLabelText(/^Nombre/), ' Grande')

    expect(screen.getByLabelText(/^Slug/)).toHaveValue('mi-mate')
    expect(screen.getByText('Dirección en la tienda: /producto/mi-mate')).toBeInTheDocument()
  })

  it('crea un producto a consultar y lleva a su ficha', async () => {
    const { app, user, router } = await setup()

    await user.click(screen.getByRole('button', { name: 'Crear producto' }))
    expect(
      await screen.findByText('Ingresá un precio en pesos mayor a 0, o dejalo a consultar'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Nombre/), 'Mate de Prueba')
    await screen.findByRole('option', { name: 'Torpedos' })
    await user.selectOptions(screen.getByLabelText(/^Línea/), 'Torpedos')
    await user.type(screen.getByLabelText(/^Descripción/), 'Un mate para probar el alta.')
    await user.type(screen.getByLabelText(/^Precio$/), '30000')
    await user.click(screen.getByRole('checkbox', { name: 'Precio a consultar (sin precio)' }))
    expect(screen.getByLabelText(/^Precio$/)).toBeDisabled()
    expect(screen.getByLabelText(/^Precio$/)).toHaveValue('')
    await user.type(screen.getByLabelText(/^Stock/), '4')
    await user.click(screen.getByRole('radio', { name: 'Publicado' }))
    await user.click(screen.getByRole('switch', { name: 'Destacado' }))
    expect(screen.getByRole('switch', { name: 'Destacado' })).toHaveAccessibleDescription(
      'Aparece en los destacados del inicio.',
    )

    await user.click(screen.getByRole('button', { name: 'Crear producto' }))

    // La pantalla se va al navegar (con ella, el Toaster del test): el aviso queda en el store.
    await waitFor(() => {
      expect(useToastStore.getState().toasts.map((item) => item.text)).toContain('Producto creado.')
    })
    const created = app.mockDb.db.products.find((product) => product.name === 'Mate de Prueba')
    expect(created).toMatchObject({
      slug: 'mate-de-prueba',
      categoryId: 'cat-torpedos',
      priceArs: null,
      stock: 4,
      featured: true,
      status: 'published',
      images: [],
      tabsOverride: null,
    })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/productos/${created?.id ?? ''}`)
    })
  })

  it('las pestañas muestran el texto del grupo de la línea elegida', async () => {
    const { user } = await setup()

    expect(
      screen.getAllByText(
        'Si lo dejás vacío, se usa el texto de su grupo de Contenido › Pestañas.',
      ),
    ).toHaveLength(2)
    await screen.findByRole('option', { name: 'Yerbas' })
    await user.selectOptions(screen.getByLabelText(/^Línea/), 'Yerbas')

    expect(
      screen.getAllByText('Si lo dejás vacío, se usa el texto de Yerbas de Contenido › Pestañas.'),
    ).toHaveLength(2)
    expect(await screen.findAllByText('Ver el texto de Yerbas')).toHaveLength(2)
  })
})
