import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { MockCategory } from '@galpon/api-client/mock'
import type { TestApp } from '../../../test/render'
import { ImageUploaderProvider } from '../../../components/media/ImageUploaderProvider'
import { createSimulatedUploader } from '../../../components/media/simulated-uploader'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { CategoriesScreen } from './CategoriesScreen'

/** Orden de las líneas de demostración. */
const DEMO_ORDER = [
  'Imperiales',
  'Torpedos',
  'Camioneros',
  'Ranchero y Galleta',
  'Bombillones',
  'Yerbas',
]

/** Monta `/lineas` con el uploader simulado y los avisos (con la app que se pase o una nueva). */
async function setup(app?: TestApp) {
  const testApp = app ?? (await createTestApp())
  const { registerMockImage } = testApp.context
  if (registerMockImage === null)
    throw new Error('La app del test tiene que estar en modo de prueba.')
  const uploader = createSimulatedUploader({ api: testApp.api, registerMockImage, durationMs: 0 })
  const user = userEvent.setup()
  const result = await renderWithApp(
    <ImageUploaderProvider uploader={uploader}>
      <CategoriesScreen />
      <Toaster />
    </ImageUploaderProvider>,
    { app: testApp, path: '/lineas' },
  )
  return { ...result, app: testApp, user }
}

/** Nombres de las líneas en el orden en que se ven (sale de la agarradera de cada una). */
function shownOrder(): string[] {
  const list = screen.getByRole('list', { name: 'Líneas' })
  return within(list)
    .getAllByRole('button', { name: /^Arrastrar / })
    .map((handle) => (handle.getAttribute('aria-label') ?? '').replace(/^Arrastrar /, ''))
}

/** Nombres de las líneas de la base simulada, por posición. */
function savedOrder(app: TestApp): string[] {
  return [...app.mockDb.db.categories]
    .sort((a, b) => a.position - b.position)
    .map((category) => category.name)
}

/** Hace que guardar cualquier posición falle en el servidor (500). */
function failPositionChanges(app: TestApp): void {
  for (const category of app.mockDb.db.categories) {
    const position = category.position
    Object.defineProperty(category, 'position', {
      configurable: true,
      enumerable: true,
      get: () => position,
      set: () => {
        throw new Error('Falla de prueba.')
      },
    })
  }
}

/** Una línea sin productos, para poder borrarla. */
function emptyCategory(position: number): MockCategory {
  return {
    id: 'cat-sin-productos',
    slug: 'sin-productos',
    name: 'Sin productos',
    group: 'yerba',
    blurb: '',
    image: null,
    position,
  }
}

/** Una foto JPG cualquiera (el `createImageBitmap` falso la hace medir 1000 × 1000). */
function photo(name = 'calabaza.jpg'): File {
  return new File(['foto'], name, { type: 'image/jpeg' })
}

/** Abre el menú de acciones de la línea `name` y elige `action`. */
async function chooseAction(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  action: string,
) {
  await user.click(screen.getByRole('button', { name: `Acciones de ${name}` }))
  await user.click(await screen.findByRole('menuitem', { name: action }))
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('CategoriesScreen', () => {
  it('muestra las líneas por posición con su dirección, grupo y publicados', async () => {
    const { app } = await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Líneas' })).toBeInTheDocument()
    expect(
      screen.getByText('Arrastrá para cambiar el orden en que se muestran en la tienda.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva línea' })).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Líneas' })
    expect(shownOrder()).toEqual(DEMO_ORDER)

    const published = app.mockDb.db.products.filter(
      (product) => product.categoryId === 'cat-imperiales' && product.status === 'published',
    ).length
    const row = screen.getByRole('button', { name: 'Arrastrar Imperiales' }).closest('li')
    if (row === null) throw new Error('No está la fila de Imperiales.')
    expect(within(row).getByText('/tienda/imperiales')).toHaveClass('font-mono')
    expect(within(row).getByText('Mates')).toBeInTheDocument()
    expect(within(row).getByText(`${String(published)} publicados`)).toBeInTheDocument()
    expect(within(row).getByRole('img')).toHaveAttribute(
      'src',
      '/mock-images/mate-imperial-premium.jpg',
    )
    expect(screen.getByRole('button', { name: 'Subir Imperiales' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar Yerbas' })).toBeDisabled()
  })

  it('reordena con el teclado y guarda los ids en el orden nuevo', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Líneas' })

    screen.getByRole('button', { name: 'Arrastrar Torpedos' }).focus()
    await user.keyboard('{ArrowUp}')

    expect(await screen.findByText('Orden guardado.')).toBeInTheDocument()
    const expected = ['Torpedos', 'Imperiales', ...DEMO_ORDER.slice(2)]
    expect(savedOrder(app)).toEqual(expected)
    expect(shownOrder()).toEqual(expected)
    expect(screen.getByRole('button', { name: 'Arrastrar Torpedos' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Bajar Camioneros' }))
    await waitFor(() => {
      expect(savedOrder(app)).toEqual([
        'Torpedos',
        'Imperiales',
        'Ranchero y Galleta',
        'Camioneros',
        'Bombillones',
        'Yerbas',
      ])
    })
  })

  it('si no se puede guardar el orden, vuelve al anterior y avisa', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Líneas' })
    failPositionChanges(app)

    screen.getByRole('button', { name: 'Arrastrar Imperiales' }).focus()
    await user.keyboard('{ArrowDown}')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el orden. Volvimos al anterior.',
    )
    await waitFor(() => {
      expect(shownOrder()).toEqual(DEMO_ORDER)
    })
    expect(savedOrder(app)).toEqual(DEMO_ORDER)
  })

  it('crea una línea con foto: el slug sigue al nombre y la foto se guarda con su texto', async () => {
    const { app, user } = await setup()
    await user.click(await screen.findByRole('button', { name: 'Nueva línea' }))

    const dialog = await screen.findByRole('dialog', { name: 'Nueva línea' })
    const name = within(dialog).getByRole('textbox', { name: /^Nombre/ })
    expect(name).toHaveFocus()
    await user.type(name, 'Calabazas Criollas')
    expect(within(dialog).getByRole('textbox', { name: /^Slug/ })).toHaveValue('calabazas-criollas')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^Grupo/ }), 'Mates')
    await user.type(within(dialog).getByRole('textbox', { name: /^Bajada/ }), 'Calabaza curada.')
    expect(within(dialog).getByText('Texto corto que acompaña la línea (hasta 200).')).toBeVisible()

    const input = dialog.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('No está el campo de la foto.')
    await user.upload(input, photo())
    const alt = await within(dialog).findByRole('textbox', { name: /^Texto alternativo/ })
    expect(alt).toHaveValue('Calabazas Criollas')
    await user.clear(alt)
    await user.type(alt, 'Calabaza criolla con virola')

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Línea creada.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    const saved = app.mockDb.db.categories.find(
      (category) => category.slug === 'calabazas-criollas',
    )
    expect(saved).toMatchObject({
      name: 'Calabazas Criollas',
      group: 'mate',
      blurb: 'Calabaza curada.',
      image: { alt: 'Calabaza criolla con virola', width: 1000, height: 1000 },
    })
    expect(saved?.image?.publicId).toMatch(/mock-/)
    expect(
      await screen.findByRole('button', { name: 'Arrastrar Calabazas Criollas' }),
    ).toBeVisible()
  })

  it('marca el slug si ya lo usa otra línea', async () => {
    const { app, user } = await setup()
    await user.click(await screen.findByRole('button', { name: 'Nueva línea' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva línea' })

    await user.type(within(dialog).getByRole('textbox', { name: /^Nombre/ }), 'Torpedos')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialog).findByText('Ese slug ya lo usa otra línea.')).toBeVisible()
    expect(within(dialog).getByRole('textbox', { name: /^Slug/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(app.mockDb.db.categories).toHaveLength(6)
  })

  it('edita una línea sin tocar el slug al cambiar el nombre', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Líneas' })
    await chooseAction(user, 'Torpedos', 'Editar')

    const dialog = await screen.findByRole('dialog', { name: 'Editar línea' })
    const name = within(dialog).getByRole('textbox', { name: /^Nombre/ })
    expect(name).toHaveValue('Torpedos')
    await user.clear(name)
    await user.type(name, 'Torpedos de algarrobo')
    expect(within(dialog).getByRole('textbox', { name: /^Slug/ })).toHaveValue('torpedos')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(
      app.mockDb.db.categories.find((category) => category.id === 'cat-torpedos'),
    ).toMatchObject({ name: 'Torpedos de algarrobo', slug: 'torpedos' })
    expect(
      await screen.findByRole('button', { name: 'Arrastrar Torpedos de algarrobo' }),
    ).toBeVisible()
  })

  it('pregunta antes de cerrar con cambios', async () => {
    const { user } = await setup()
    await user.click(await screen.findByRole('button', { name: 'Nueva línea' }))
    const dialog = await screen.findByRole('dialog', { name: 'Nueva línea' })
    await user.type(within(dialog).getByRole('textbox', { name: /^Nombre/ }), 'Calabazas')

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    const confirm = await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })
    await user.click(within(confirm).getByRole('button', { name: 'Seguir editando' }))
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(within(dialog).getByRole('textbox', { name: /^Nombre/ })).toHaveValue('Calabazas')

    await user.keyboard('{Escape}')
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Descartar' }),
    )
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('no borra una línea con productos y lo explica dentro del diálogo', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Líneas' })
    await chooseAction(user, 'Imperiales', 'Borrar')

    const confirm = await screen.findByRole('alertdialog', {
      name: '¿Borrar la línea «Imperiales»?',
    })
    expect(
      within(confirm).getByText(
        'Solo se puede borrar una línea sin productos (contando borradores y archivados).',
      ),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Borrar' }))

    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'La línea tiene productos. Movelos a otra línea antes de borrarla.',
    )
    expect(app.mockDb.db.categories.some((category) => category.id === 'cat-imperiales')).toBe(true)
  })

  it('borra una línea sin productos', async () => {
    const app = await createTestApp()
    app.mockDb.db.categories.push(emptyCategory(7))
    const { user } = await setup(app)
    await screen.findByRole('list', { name: 'Líneas' })
    await chooseAction(user, 'Sin productos', 'Borrar')

    const confirm = await screen.findByRole('alertdialog')
    await user.click(within(confirm).getByRole('button', { name: 'Borrar' }))

    expect(await screen.findByText('Línea borrada.')).toBeInTheDocument()
    await waitFor(() => {
      expect(shownOrder()).toEqual(DEMO_ORDER)
    })
    expect(app.mockDb.db.categories).toHaveLength(6)
  })

  it('sin líneas invita a crear la primera', async () => {
    const app = await createTestApp()
    app.mockDb.db.categories = []
    const { user } = await setup(app)

    expect(await screen.findByText('Todavía no hay líneas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear la primera' }))
    expect(await screen.findByRole('dialog', { name: 'Nueva línea' })).toBeInTheDocument()
  })

  it('si no carga, muestra el error y "Reintentar" vuelve a cargar', async () => {
    const app = await createTestApp()
    const session = app.mockDb.db.adminSession
    app.mockDb.db.adminSession = null
    const { user } = await setup(app)

    expect(await screen.findByText('No pudimos cargar las líneas.')).toBeInTheDocument()
    app.mockDb.db.adminSession = session
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('list', { name: 'Líneas' })).toBeInTheDocument()
  })
})
