import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { MockProduct } from '@galpon/api-client/mock'
import type { TestApp } from '../../../test/render'
import { ImageUploaderProvider } from '../../../components/media/ImageUploaderProvider'
import { createSimulatedUploader } from '../../../components/media/simulated-uploader'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { validationProblem } from '../../../test/problem-response'
import { createTestApp, renderWithApp } from '../../../test/render'
import { ProductScreen } from './ProductScreen'

/** Identificador del Mate Imperial Premium, con dos fotos. */
const PREMIUM_ID = 'prd-imperial-premium'

/** Identificador del Mate Imperial de Calabaza, con una sola foto: de él parten las pruebas de subir y quitar. */
const ONE_PHOTO_ID = 'prd-imperial-calabaza'

/** Opciones de {@link setup}. */
interface SetupOptions {
  /** Producto que se abre; por omisión el Mate Imperial Premium. */
  id?: string
  /** Duración de cada subida simulada; por omisión 0. */
  uploadMs?: number
  /** Prepara la base antes de montar. */
  prepare?: (app: TestApp) => void
}

/**
 * Monta `/productos/$id` con el uploader simulado y los avisos, y anota el cuerpo de cada `PATCH`
 * del producto (con un middleware del cliente, no con un mock de `fetch`).
 */
async function setup({ id = PREMIUM_ID, uploadMs = 0, prepare }: SetupOptions = {}) {
  const app = await createTestApp()
  prepare?.(app)
  const { registerMockImage } = app.context
  if (registerMockImage === null) {
    throw new Error('La app del test tiene que estar en modo de prueba.')
  }
  const patches: unknown[] = []
  app.api.use({
    async onRequest({ request }) {
      if (request.method === 'PATCH' && request.url.includes('/admin/products/')) {
        const body: unknown = await request.clone().json()
        patches.push(body)
      }
      return undefined
    },
  })
  const uploader = createSimulatedUploader({
    api: app.api,
    registerMockImage,
    durationMs: uploadMs,
  })
  const user = userEvent.setup()
  const result = await renderWithApp(
    <ImageUploaderProvider uploader={uploader}>
      <ProductScreen id={id} />
      <Toaster />
    </ImageUploaderProvider>,
    { app, path: `/productos/${id}`, routePath: '/productos/$id' },
  )
  await screen.findByLabelText(/^Nombre/)
  return { ...result, app, user, patches }
}

/** El producto de la base simulada. */
function stored(app: TestApp, id = PREMIUM_ID): MockProduct {
  const product = app.mockDb.db.products.find((candidate) => candidate.id === id)
  if (product === undefined) throw new Error(`Falta el producto ${id}.`)
  return product
}

/** Una foto JPG cualquiera (el `createImageBitmap` falso la hace medir 1000 × 1000). */
function photo(name: string): File {
  return new File(['foto'], name, { type: 'image/jpeg' })
}

/** El `input type="file"` del área de fotos. */
function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) throw new Error('Falta el campo de archivos.')
  return input
}

/** Textos alternativos de las fotos del formulario, en el orden en que se ven. */
function altTexts(): string[] {
  const list = screen.getByRole('list', { name: 'Fotos del producto' })
  return within(list)
    .getAllByLabelText('Texto alternativo')
    .map((input) => (input as HTMLInputElement).value)
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('ProductScreen', () => {
  it('muestra el producto con su código, sus fechas y sus datos', async () => {
    await setup()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Mate Imperial Premium' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Código N°01 · Creado el 01/09/2026 · Última modificación 01/09/2026 09:00'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^Slug/)).toHaveValue('mate-imperial-premium')
    expect(screen.getByLabelText(/^Precio$/)).toHaveValue('$39.999')
    expect(screen.getByRole('radio', { name: 'Publicado' })).toBeChecked()
    expect(altTexts()).toEqual([
      'Mate Imperial Premium con virola de alpaca cincelada y base con pelotitas de bronce',
      'Mate Imperial Premium con virola cincelada, base con pelotitas de bronce y una bombilla de pico de bronce al costado',
    ])
    expect(await screen.findAllByText('Ver el texto de Mates')).toHaveLength(2)
  })

  it('sube 2 fotos, reordena con el teclado, quita una y guarda el orden nuevo sin url', async () => {
    const { app, user, container, patches } = await setup({ id: ONE_PHOTO_ID })

    await user.upload(fileInput(container), [photo('a.jpg'), photo('b.jpg')])
    await waitFor(() => {
      expect(altTexts()).toHaveLength(3)
    })
    expect(altTexts().slice(1)).toEqual(['Mate Imperial de Calabaza', 'Mate Imperial de Calabaza'])
    const [, inputA, inputB] = within(
      screen.getByRole('list', { name: 'Fotos del producto' }),
    ).getAllByLabelText('Texto alternativo')
    if (inputA === undefined || inputB === undefined) throw new Error('Faltan las fotos subidas.')
    await user.clear(inputA)
    await user.type(inputA, 'Foto A')
    await user.clear(inputB)
    await user.type(inputB, 'Foto B')

    screen.getByRole('button', { name: 'Arrastrar la foto 3' }).focus()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    await waitFor(() => {
      expect(altTexts()[0]).toBe('Foto B')
    })
    expect(screen.getByText('Fotos del producto: quedó en el lugar 1 de 3.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar la foto 2' }))
    expect(altTexts()).toEqual(['Foto B', 'Foto A'])

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    const body = patches.at(-1) as { images: Record<string, unknown>[]; expectedUpdatedAt: string }
    expect(body.images.map((image) => image.alt)).toEqual(['Foto B', 'Foto A'])
    for (const image of body.images) expect(image).not.toHaveProperty('url')
    expect(body.expectedUpdatedAt).toBe('2026-09-01T12:00:00Z')
    expect(stored(app, ONE_PHOTO_ID).images.map((image) => image.alt)).toEqual(['Foto B', 'Foto A'])
  })

  it('al quitar una foto el foco va a la vecina y, sin fotos, a "Elegir archivos"', async () => {
    const { user, container } = await setup({ id: ONE_PHOTO_ID })

    await user.upload(fileInput(container), [photo('a.jpg')])
    await waitFor(() => {
      expect(altTexts()).toHaveLength(2)
    })
    await user.click(screen.getByRole('button', { name: 'Quitar la foto 1' }))
    // La subida pasa al primer lugar: su texto alternativo tiene el foco, no el body.
    const list = screen.getByRole('list', { name: 'Fotos del producto' })
    expect(within(list).getByLabelText('Texto alternativo')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Quitar la foto 1' }))
    expect(screen.getByRole('button', { name: 'Elegir archivos' })).toHaveFocus()

    // Lo mismo con una subida que falló: "Quitar" la saca de la cola.
    await user.upload(fileInput(container), [photo('error-mate.jpg')])
    await user.click(await screen.findByRole('button', { name: 'Quitar' }))
    expect(screen.getByRole('button', { name: 'Elegir archivos' })).toHaveFocus()
  })

  it('no deja guardar mientras una foto se está subiendo', async () => {
    const { user, container, patches } = await setup({ uploadMs: 60_000 })

    await user.upload(fileInput(container), [photo('lenta.jpg')])
    expect(await screen.findByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Esperá a que terminen de subir las fotos.')).toBeInTheDocument()
    expect(patches).toHaveLength(0)
  })

  it('una foto error- falla, no deja guardar y con "Reintentar" se sube y se guarda', async () => {
    const { app, user, container } = await setup({ id: ONE_PHOTO_ID })

    await user.upload(fileInput(container), [photo('error-mate.jpg')])
    expect(
      await screen.findByText(
        'Falló la subida simulada (el archivo empieza con error-). Reintentá.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText('Hay fotos que no se subieron: reintentá o quitalas.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(altTexts()).toHaveLength(2)
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(stored(app, ONE_PHOTO_ID).images).toHaveLength(2)
  })

  it('un slug que ya usa otro producto queda marcado en el campo', async () => {
    const { user } = await setup()

    await user.clear(screen.getByLabelText(/^Slug/))
    await user.type(screen.getByLabelText(/^Slug/), 'mate-galleta')
    expect(
      screen.getByText(
        'Al guardar, /producto/mate-imperial-premium va a redirigir a /producto/mate-galleta.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('Ese slug ya lo usa otro producto, o lo usó antes.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^Slug/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/^Slug/)).toHaveFocus()
  })

  it('un 422 en el texto alternativo de una foto va a ese campo', async () => {
    const { app, user } = await setup()
    app.api.use({
      onRequest: ({ request }) =>
        request.method === 'PATCH'
          ? validationProblem([
              { field: 'images.0.alt', message: 'Ese texto no describe la foto.' },
            ])
          : undefined,
    })

    await user.type(screen.getByLabelText(/^Nombre/), ' Edición')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ese texto no describe la foto.')).toBeInTheDocument()
    const [alt] = within(
      screen.getByRole('list', { name: 'Fotos del producto' }),
    ).getAllByLabelText('Texto alternativo')
    expect(alt).toHaveAttribute('aria-invalid', 'true')
    expect(alt).toHaveFocus()
    // Todos los errores tenían su campo: no hace falta el aviso general.
    expect(screen.queryByText('Revisá los campos marcados.')).not.toBeInTheDocument()
    expect(stored(app).name).toBe('Mate Imperial Premium')
  })

  it('un slug nuevo deja el anterior en las direcciones que redirigen', async () => {
    const { app, user } = await setup()

    await user.clear(screen.getByLabelText(/^Slug/))
    await user.type(screen.getByLabelText(/^Slug/), 'mate-imperial-de-lujo')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText(
        'Direcciones anteriores que redirigen: /producto/mate-imperial-premium',
      ),
    ).toBeInTheDocument()
    expect(stored(app).previousSlugs).toEqual(['mate-imperial-premium'])
  })

  it('si otra pestaña guardó antes, "Guardar mis cambios igual" pisa la otra versión', async () => {
    const { app, user, patches } = await setup()

    await user.clear(screen.getByLabelText(/^Nombre/))
    await user.type(screen.getByLabelText(/^Nombre/), 'Mate Imperial Editado')
    Object.assign(stored(app), { name: 'Otra pestaña', updatedAt: '2026-10-27T14:00:00Z' })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Este producto cambió mientras lo editabas',
    })
    await user.click(within(dialog).getByRole('button', { name: 'Guardar mis cambios igual' }))

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(stored(app).name).toBe('Mate Imperial Editado')
    expect(patches.at(-1)).not.toHaveProperty('expectedUpdatedAt')
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  it('si otra pestaña guardó antes, "Ver la versión guardada" descarta lo editado', async () => {
    const { app, user } = await setup()

    await user.clear(screen.getByLabelText(/^Nombre/))
    await user.type(screen.getByLabelText(/^Nombre/), 'Mate Imperial Editado')
    Object.assign(stored(app), { name: 'Otra pestaña', updatedAt: '2026-10-27T14:00:00Z' })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Este producto cambió mientras lo editabas',
    })
    await user.click(within(dialog).getByRole('button', { name: 'Ver la versión guardada' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Otra pestaña')
    })
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
    expect(stored(app).name).toBe('Otra pestaña')
  })

  it('el aviso de otra versión arranca con el foco en el panel: un Enter no descarta lo editado', async () => {
    const { app, user } = await setup()

    await user.clear(screen.getByLabelText(/^Nombre/))
    await user.type(screen.getByLabelText(/^Nombre/), 'Mate Imperial Editado')
    Object.assign(stored(app), { name: 'Otra pestaña', updatedAt: '2026-10-27T14:00:00Z' })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Este producto cambió mientras lo editabas',
    })
    expect(dialog).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Mate Imperial Editado')
    // Con Tab se llega a las dos opciones, primero "Ver la versión guardada".
    await user.tab()
    expect(within(dialog).getByRole('button', { name: 'Ver la versión guardada' })).toHaveFocus()
  })

  it('Escape sobre el aviso de otra versión solo lo cierra y conserva lo editado', async () => {
    const { app, user } = await setup()

    await user.clear(screen.getByLabelText(/^Nombre/))
    await user.type(screen.getByLabelText(/^Nombre/), 'Mate Imperial Editado')
    Object.assign(stored(app), { name: 'Otra pestaña', updatedAt: '2026-10-27T14:00:00Z' })
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('alertdialog', { name: 'Este producto cambió mientras lo editabas' })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Mate Imperial Editado')
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    expect(stored(app).name).toBe('Otra pestaña')

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByRole('alertdialog', { name: 'Este producto cambió mientras lo editabas' }),
    ).toBeInTheDocument()
  })

  it('guardar cambios de un archivado lo avisa y lo deja en borrador', async () => {
    const { app, user } = await setup({
      prepare: (testApp) => {
        stored(testApp).status = 'archived'
      },
    })

    expect(
      screen.getByText(
        'Si guardás cambios, el producto pasa a borrador. Para publicarlo, usá «Volver a publicar».',
      ),
    ).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/^Nombre/))
    await user.type(screen.getByLabelText(/^Nombre/), 'Mate Imperial Corregido')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await screen.findByText('Cambios guardados. El producto pasó de archivado a borrador.'),
    ).toBeInTheDocument()
    expect(stored(app)).toMatchObject({ name: 'Mate Imperial Corregido', status: 'draft' })
    expect(await screen.findByRole('radio', { name: 'Borrador' })).toBeChecked()
    expect(
      screen.queryByText('Este producto está archivado: no se ve en la tienda.'),
    ).not.toBeInTheDocument()
  })

  it('un producto archivado se vuelve a publicar', async () => {
    const { app, user } = await setup({
      prepare: (testApp) => {
        stored(testApp).status = 'archived'
      },
    })

    expect(
      screen.getByText('Este producto está archivado: no se ve en la tienda.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Publicado' })).not.toBeInTheDocument()
    expect(screen.getByText('Archivado')).toBeInTheDocument()
    // El guardado queda frenado hasta `release`, para ver el botón mientras publica.
    let release: () => void = () => undefined
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    app.api.use({
      async onRequest({ request }) {
        if (request.method === 'PATCH') await held
        return undefined
      },
    })

    await user.click(screen.getByRole('button', { name: 'Volver a publicar' }))

    expect(await screen.findByRole('button', { name: 'Publicando…' })).toBeDisabled()
    release()
    expect(await screen.findByText('Producto publicado de nuevo.')).toBeInTheDocument()
    expect(stored(app).status).toBe('published')
    expect(await screen.findByRole('radio', { name: 'Publicado' })).toBeChecked()
    expect(
      screen.queryByText('Este producto está archivado: no se ve en la tienda.'),
    ).not.toBeInTheDocument()
  })

  it('un producto que no existe muestra el aviso y vuelve a la lista', async () => {
    const app = await createTestApp()
    await renderWithApp(<ProductScreen id="prd-no-existe" />, {
      app,
      path: '/productos/prd-no-existe',
      routePath: '/productos/$id',
    })

    expect(await screen.findByText('No encontramos ese producto.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a productos' })).toHaveAttribute(
      'href',
      '/productos',
    )
  })
})
