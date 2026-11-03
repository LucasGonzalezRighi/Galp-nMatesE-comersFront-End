import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { failBackgroundReload } from '../../../test/fail-background-reload'
import { validationProblem } from '../../../test/problem-response'
import { createTestApp, renderWithApp } from '../../../test/render'
import { CombosScreen } from './CombosScreen'

/** Orden de los combos de ejemplo. */
const DEMO_ORDER = [
  'Dúo Imperial',
  'Camionero y Canarias',
  'Torpedo completo',
  'Bombilla y yerba',
  'Galleta y Canarias',
]

/** Monta `/combos` con los avisos (con la app que se pase o una nueva). */
async function setup(app?: TestApp) {
  const testApp = app ?? (await createTestApp())
  const user = userEvent.setup()
  const result = await renderWithApp(
    <>
      <CombosScreen />
      <Toaster />
    </>,
    { app: testApp, path: '/combos' },
  )
  return { ...result, app: testApp, user }
}

/** Nombres de los combos en el orden en que se ven (sale de la agarradera de cada uno). */
function shownOrder(): string[] {
  const list = screen.getByRole('list', { name: 'Combos' })
  return within(list)
    .getAllByRole('button', { name: /^Arrastrar / })
    .map((handle) => (handle.getAttribute('aria-label') ?? '').replace(/^Arrastrar /, ''))
}

/** Nombres de los combos de la base simulada, por posición. */
function savedOrder(app: TestApp): string[] {
  return [...app.mockDb.db.combos].sort((a, b) => a.position - b.position).map((c) => c.name)
}

/** La fila de un combo, por su nombre. */
function row(name: string): HTMLElement {
  const item = screen.getByRole('button', { name: `Arrastrar ${name}` }).closest('li')
  if (item === null) throw new Error(`No está la fila de ${name}.`)
  return item
}

/** Hace que guardar cualquier posición falle en el servidor (500). */
function failPositionChanges(app: TestApp): void {
  for (const combo of app.mockDb.db.combos) {
    const position = combo.position
    Object.defineProperty(combo, 'position', {
      configurable: true,
      enumerable: true,
      get: () => position,
      set: () => {
        throw new Error('Falla de prueba.')
      },
    })
  }
}

/** Abre el menú de acciones del combo `name` y elige `action`. */
async function chooseAction(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  action: string,
) {
  await user.click(screen.getByRole('button', { name: `Acciones de ${name}` }))
  await user.click(await screen.findByRole('menuitem', { name: action }))
}

/** Abre "Nuevo combo" y espera a que las listas de piezas tengan los productos. */
async function openNew(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(await screen.findByRole('button', { name: 'Nuevo combo' }))
  const dialog = await screen.findByRole('dialog', { name: 'Nuevo combo' })
  await within(dialog).findByRole('option', { name: 'Mate Imperial Premium · $39.999' })
  return dialog
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('CombosScreen', () => {
  it('muestra los combos por posición con piezas, precio, ahorro, estado y avisos', async () => {
    await setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Combos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nuevo combo' })).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Combos' })
    expect(shownOrder()).toEqual(DEMO_ORDER)

    const duo = row('Dúo Imperial')
    expect(
      within(duo).getByText('Mate Imperial Premium + Bombillón Premium Curvo'),
    ).toBeInTheDocument()
    expect(within(duo).getByText('$61.999')).toBeInTheDocument()
    expect(within(duo).getByText('Ahorro $6.999')).toBeInTheDocument()
    expect(within(duo).getByText('Publicado')).toBeInTheDocument()

    const galleta = row('Galleta y Canarias')
    expect(within(galleta).getByText('Borrador')).toBeInTheDocument()
    expect(within(galleta).getByText('Sin stock')).toBeInTheDocument()
    expect(within(duo).queryByText('Sin stock')).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Subir Dúo Imperial' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar Galleta y Canarias' })).toBeDisabled()
  })

  it('avisa en la fila si una pieza ya no se vende o si el combo se quedó sin ahorro', async () => {
    const app = await createTestApp()
    const canarias = app.mockDb.db.products.find((product) => product.id === 'prd-yerba-canarias')
    const imperial = app.mockDb.db.products.find((product) => product.id === 'prd-imperial-premium')
    if (canarias === undefined || imperial === undefined) throw new Error('Faltan productos.')
    canarias.status = 'draft'
    imperial.priceArs = 30000
    await setup(app)
    await screen.findByRole('list', { name: 'Combos' })

    expect(within(row('Camionero y Canarias')).getByText('Pieza no disponible')).toBeVisible()
    expect(within(row('Dúo Imperial')).getByText('Sin ahorro')).toBeVisible()
    expect(within(row('Dúo Imperial')).queryByText(/^Ahorro /)).not.toBeInTheDocument()
  })

  it('reordena con el teclado y guarda los ids en el orden nuevo', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Combos' })

    screen.getByRole('button', { name: 'Arrastrar Camionero y Canarias' }).focus()
    await user.keyboard('{ArrowUp}')

    expect(await screen.findByText('Orden guardado.')).toBeInTheDocument()
    const expected = ['Camionero y Canarias', 'Dúo Imperial', ...DEMO_ORDER.slice(2)]
    expect(savedOrder(app)).toEqual(expected)
    expect(shownOrder()).toEqual(expected)

    await user.click(screen.getByRole('button', { name: 'Bajar Torpedo completo' }))
    await waitFor(() => {
      expect(savedOrder(app)).toEqual([
        'Camionero y Canarias',
        'Dúo Imperial',
        'Bombilla y yerba',
        'Torpedo completo',
        'Galleta y Canarias',
      ])
    })
  })

  it('si no se puede guardar el orden, vuelve al anterior y avisa', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Combos' })
    failPositionChanges(app)

    screen.getByRole('button', { name: 'Arrastrar Dúo Imperial' }).focus()
    await user.keyboard('{ArrowDown}')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el orden. Volvimos al anterior.',
    )
    await waitFor(() => {
      expect(shownOrder()).toEqual(DEMO_ORDER)
    })
    expect(savedOrder(app)).toEqual(DEMO_ORDER)
  })

  it('crea un combo publicado con la suma y el ahorro en vivo', async () => {
    const { app, user } = await setup()
    const dialog = await openNew(user)

    const name = within(dialog).getByRole('textbox', { name: /^Nombre/ })
    expect(name).toHaveFocus()
    await user.type(name, 'Imperial y Canarias')
    await user.type(
      within(dialog).getByRole('textbox', { name: /^Descripción/ }),
      'Para arrancar la ronda.',
    )
    expect(within(dialog).getByText('Elegí las piezas para ver la suma y el ahorro.')).toBeVisible()

    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /^Mate/ }),
      'Mate Imperial Premium · $39.999',
    )
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /^Yerba/ }),
      'Yerba Canarias 1 kg · $9.999',
    )
    expect(within(dialog).getByText('Suma de las piezas $49.998')).toBeVisible()
    await user.type(within(dialog).getByRole('textbox', { name: /^Precio final/ }), '44999')
    expect(within(dialog).getByText('Suma de las piezas $49.998 · Ahorro $4.999')).toBeVisible()

    await user.click(within(dialog).getByRole('radio', { name: 'Publicado' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Combo creado.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(
      app.mockDb.db.combos.find((combo) => combo.name === 'Imperial y Canarias'),
    ).toMatchObject({
      description: 'Para arrancar la ronda.',
      productIds: ['prd-imperial-premium', 'prd-yerba-canarias'],
      priceArs: 44999,
      status: 'published',
      position: 6,
    })
    expect(
      await screen.findByRole('button', { name: 'Arrastrar Imperial y Canarias' }),
    ).toBeVisible()
  })

  it('avisa si la pieza elegida no tiene stock', async () => {
    const { user } = await setup()
    const dialog = await openNew(user)
    const mate = within(dialog).getByRole('combobox', { name: /^Mate/ })

    await user.selectOptions(mate, 'Mate Galleta · $27.999')

    expect(
      within(dialog).getByText('Sin stock: el combo se ve agotado en la tienda.'),
    ).toBeVisible()
  })

  it('no guarda un combo con una sola pieza', async () => {
    const { app, user } = await setup()
    const dialog = await openNew(user)
    await user.type(within(dialog).getByRole('textbox', { name: /^Nombre/ }), 'Solo un mate')
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /^Mate/ }),
      'Mate Imperial Premium · $39.999',
    )
    await user.type(within(dialog).getByRole('textbox', { name: /^Precio final/ }), '35000')

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialog).findByText('Cargá de 2 a 3 productos')).toBeVisible()
    expect(within(dialog).getByRole('combobox', { name: /^Mate/ })).toHaveFocus()
    expect(app.mockDb.db.combos).toHaveLength(5)
  })

  it('avisa en vivo si el precio no es menor que la suma y marca el 422 en el precio', async () => {
    const { app, user } = await setup()
    const dialog = await openNew(user)
    await user.type(within(dialog).getByRole('textbox', { name: /^Nombre/ }), 'Caro')
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /^Mate/ }),
      'Mate Imperial Premium · $39.999',
    )
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: /^Yerba/ }),
      'Yerba Canarias 1 kg · $9.999',
    )
    const price = within(dialog).getByRole('textbox', { name: /^Precio final/ })
    await user.type(price, '49998')

    expect(within(dialog).getByText('Suma de las piezas $49.998 · Ahorro $0')).toBeVisible()
    expect(
      within(dialog).getByText('El precio tiene que ser menor que la suma de las piezas.'),
    ).toBeVisible()

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(
      await within(dialog).findByText(
        'El precio del combo tiene que ser menor que la suma de los productos ($49.998)',
      ),
    ).toBeVisible()
    expect(price).toHaveAttribute('aria-invalid', 'true')
    expect(
      within(dialog).queryByText('El precio tiene que ser menor que la suma de las piezas.'),
    ).not.toBeInTheDocument()
    expect(app.mockDb.db.combos).toHaveLength(5)
  })

  it('marca la pieza que el servidor rechaza en su lista', async () => {
    const app = await createTestApp()
    const canarias = app.mockDb.db.products.find((product) => product.id === 'prd-yerba-canarias')
    if (canarias === undefined) throw new Error('Falta la Yerba Canarias.')
    canarias.status = 'draft'
    const { user } = await setup(app)
    await screen.findByRole('list', { name: 'Combos' })
    await chooseAction(user, 'Camionero y Canarias', 'Editar')
    const dialog = await screen.findByRole('dialog', { name: 'Editar combo' })
    const yerba = within(dialog).getByRole('combobox', { name: /^Yerba/ })
    await within(dialog).findByRole('option', { name: 'Camionero Virola de Aluminio · $24.999' })

    expect(yerba).toHaveDisplayValue('Yerba Canarias 1 kg (no disponible)')
    expect(
      within(dialog).getByText('Ya no está publicado o no tiene precio: elegí otro.'),
    ).toBeVisible()
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(
      await within(dialog).findByText('Elegí un producto publicado y con precio'),
    ).toBeVisible()
    expect(yerba).toHaveAttribute('aria-invalid', 'true')
  })

  it('un 422 de las piezas va al grupo y una ruta que no se dibuja avisa el mensaje general', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Combos' })
    app.api.use({
      onRequest: ({ request }) =>
        request.method === 'PATCH' && request.url.includes('/admin/combos/cmb-duo-imperial')
          ? validationProblem(
              [
                { field: 'productIds', message: 'Elegí productos de grupos distintos' },
                { field: 'position', message: 'La posición no es válida.' },
              ],
              'Revisá los datos del combo.',
            )
          : undefined,
    })
    await chooseAction(user, 'Dúo Imperial', 'Editar')
    const dialog = await screen.findByRole('dialog', { name: 'Editar combo' })
    await within(dialog).findByRole('option', { name: 'Mate Imperial Premium · $39.999' })

    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialog).findByText('Elegí productos de grupos distintos')).toBeVisible()
    expect(await screen.findByText('Revisá los datos del combo.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Editar combo' })).toBeInTheDocument()
  })

  it('edita el precio y el estado de un combo', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Combos' })
    await chooseAction(user, 'Dúo Imperial', 'Editar')
    const dialog = await screen.findByRole('dialog', { name: 'Editar combo' })
    await within(dialog).findByRole('option', { name: 'Mate Imperial Premium · $39.999' })

    expect(within(dialog).getByRole('textbox', { name: /^Nombre/ })).toHaveValue('Dúo Imperial')
    expect(within(dialog).getByRole('combobox', { name: /^Mate/ })).toHaveDisplayValue(
      'Mate Imperial Premium · $39.999',
    )
    expect(within(dialog).getByRole('combobox', { name: /^Bombilla/ })).toHaveDisplayValue(
      'Bombillón Premium Curvo · $28.999',
    )
    expect(within(dialog).getByRole('combobox', { name: /^Yerba/ })).toHaveDisplayValue('Sin yerba')
    expect(within(dialog).getByText('Suma de las piezas $68.998 · Ahorro $6.999')).toBeVisible()
    const price = within(dialog).getByRole('textbox', { name: /^Precio final/ })
    await user.clear(price)
    await user.type(price, '59999')
    await user.click(within(dialog).getByRole('radio', { name: 'Borrador' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument()
    expect(app.mockDb.db.combos.find((combo) => combo.id === 'cmb-duo-imperial')).toMatchObject({
      priceArs: 59999,
      status: 'draft',
    })
    await waitFor(() => {
      expect(within(row('Dúo Imperial')).getByText('Ahorro $8.999')).toBeVisible()
    })
    expect(within(row('Dúo Imperial')).getByText('Borrador')).toBeVisible()
  })

  it('pregunta antes de cerrar con cambios', async () => {
    const { user } = await setup()
    const dialog = await openNew(user)
    await user.type(within(dialog).getByRole('textbox', { name: /^Nombre/ }), 'Ronda')

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    const confirm = await screen.findByRole('alertdialog', { name: '¿Descartar los cambios?' })
    await user.click(within(confirm).getByRole('button', { name: 'Seguir editando' }))
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
    expect(within(dialog).getByRole('textbox', { name: /^Nombre/ })).toHaveValue('Ronda')

    await user.keyboard('{Escape}')
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Descartar' }),
    )
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('borra un combo con confirmación y el foco va al título', async () => {
    const { app, user } = await setup()
    await screen.findByRole('list', { name: 'Combos' })

    await chooseAction(user, 'Bombilla y yerba', 'Borrar')
    const confirm = await screen.findByRole('alertdialog', {
      name: '¿Borrar el combo «Bombilla y yerba»?',
    })
    expect(
      within(confirm).getByText(
        'La tienda deja de mostrarlo. Los pedidos que ya lo tienen guardan su copia.',
      ),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Borrar' }))

    expect(await screen.findByText('Combo borrado.')).toBeInTheDocument()
    await waitFor(() => {
      expect(shownOrder()).toEqual(DEMO_ORDER.filter((name) => name !== 'Bombilla y yerba'))
    })
    expect(app.mockDb.db.combos).toHaveLength(4)
    expect(screen.getByRole('heading', { level: 1, name: 'Combos' })).toHaveFocus()
  })

  it('sin combos invita a crear el primero', async () => {
    const app = await createTestApp()
    app.mockDb.db.combos = []
    const { user } = await setup(app)

    expect(await screen.findByText('Todavía no hay combos.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear el primero' }))
    expect(await screen.findByRole('dialog', { name: 'Nuevo combo' })).toBeInTheDocument()
  })

  it('si no carga, muestra el error y "Reintentar" vuelve a cargar', async () => {
    const app = await createTestApp()
    const session = app.mockDb.db.adminSession
    app.mockDb.db.adminSession = null
    const { user } = await setup(app)

    expect(await screen.findByText('No pudimos cargar los combos.')).toBeInTheDocument()
    app.mockDb.db.adminSession = session
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('list', { name: 'Combos' })).toBeInTheDocument()
  })

  it('si la recarga en segundo plano falla, la lista sigue a la vista', async () => {
    const { app } = await setup()
    await screen.findByRole('list', { name: 'Combos' })

    await failBackgroundReload(app)

    expect(screen.queryByText('No pudimos cargar los combos.')).not.toBeInTheDocument()
    expect(shownOrder()).toEqual(DEMO_ORDER)
  })
})
