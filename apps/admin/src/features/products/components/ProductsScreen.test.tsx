import { useNavigate, useSearch } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { MockProduct } from '@galpon/api-client/mock'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { failBackgroundReload } from '../../../test/fail-background-reload'
import { createTestApp, renderWithApp } from '../../../test/render'
import { productsSearchSchema } from '../products-search'
import { ProductsScreen } from './ProductsScreen'

/** La ruta `/productos` del test: valida la búsqueda como la ruta real y navega con los filtros. */
function ProductsRoute() {
  const search = productsSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  return (
    <>
      <ProductsScreen
        search={search}
        onSearchChange={(next) => {
          void navigate({ to: '/productos', search: next })
        }}
        storeUrl="http://localhost:3000"
      />
      <Toaster />
    </>
  )
}

async function renderProducts(app: TestApp, path = '/productos') {
  return renderWithApp(<ProductsRoute />, { app, path, routePath: '/productos' })
}

/** Nombres de los productos de la tabla, en orden. */
function rowNames(): string[] {
  const table = screen.getByRole('table', { name: 'Productos' })
  return within(table)
    .queryAllByRole('link')
    .map((link) => link.textContent)
}

/** Aviso de arriba de la tabla cuando una recarga en segundo plano falla. */
const STALE_LIST_ERROR = 'No pudimos actualizar la lista: se ven los últimos datos que cargaron.'

/** El producto de la base simulada que se llama `name`. */
function productInDb(app: TestApp, name: string): MockProduct {
  const product = app.mockDb.db.products.find((candidate) => candidate.name === name)
  if (product === undefined) throw new Error(`Falta el producto ${name}.`)
  return product
}

/** La fila de un producto. */
function rowOf(name: string): HTMLElement {
  const row = screen.getByRole('link', { name }).closest('tr')
  if (row === null) throw new Error(`Falta la fila de ${name}.`)
  return row
}

afterEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('ProductsScreen', () => {
  it('lista los productos de a 24 con su foto, código, precio, stock y estado', async () => {
    const app = await createTestApp()
    await renderProducts(app)

    expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nuevo producto' })).toHaveAttribute(
      'href',
      '/productos/nuevo',
    )
    expect(await screen.findByRole('link', { name: 'Mate Imperial Premium' })).toHaveAttribute(
      'href',
      '/productos/prd-imperial-premium',
    )
    expect(rowNames()).toHaveLength(24)
    expect(screen.getByText('Mostrando 1–24 de 27')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Productos' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['Foto', 'Producto', 'Línea', 'Precio', 'Stock', 'Estado', 'Acciones'])

    const premium = rowOf('Mate Imperial Premium')
    expect(premium.querySelector('img')).toHaveAttribute(
      'src',
      '/mock-images/mate-imperial-premium.jpg',
    )
    expect(within(premium).getByText('N°01')).toBeInTheDocument()
    expect(within(premium).getByText('Destacado')).toBeInTheDocument()
    expect(within(premium).getByText('Imperiales')).toBeInTheDocument()
    expect(within(premium).getByText('$39.999')).toBeInTheDocument()
    expect(within(premium).getByText('Publicado')).toBeInTheDocument()
    expect(within(rowOf('Mate Torpedo Línea Acero')).getByText('A consultar')).toBeInTheDocument()
    expect(within(rowOf('Mate Galleta')).getByText('Sin stock')).toBeInTheDocument()
    await waitFor(() => {
      expect(within(rowOf('Mate Coquito Criollo')).getByText('Poco stock')).toBeInTheDocument()
    })
  })

  it('los filtros y el orden van a la URL y vuelven a la primera página', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    const { router } = await renderProducts(app, '/productos?pagina=2')
    await screen.findByRole('link', { name: 'Bombillón Curvo' })

    await user.type(screen.getByLabelText('Buscar'), 'canarias')
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: 'canarias' })
    })
    await waitFor(() => {
      expect(rowNames()).toEqual([
        'Yerba Canarias 1 kg',
        'Yerba Canarias Serena 1 kg',
        'Yerba Canarias Té y Jengibre 1 kg',
      ])
    })

    await user.click(screen.getByRole('button', { name: 'Ordenar por Precio' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: 'canarias', orden: 'menor' })
    })
    await user.click(screen.getByRole('button', { name: 'Ordenar por Precio' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: 'canarias', orden: 'mayor' })
    })
    await waitFor(() => {
      expect(rowNames()[2]).toBe('Yerba Canarias 1 kg')
    })
    await user.click(screen.getByRole('button', { name: 'Ordenar por Producto' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: 'canarias', orden: 'az' })
    })

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ orden: 'az' })
    })
    expect(screen.getByLabelText('Buscar')).toHaveValue('')

    await user.selectOptions(screen.getByLabelText('Línea'), 'yerbas')
    await user.selectOptions(screen.getByLabelText('Estado'), 'published')
    await user.click(screen.getByRole('checkbox', { name: 'Solo sin stock' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({
        orden: 'az',
        linea: 'yerbas',
        estado: 'published',
        sinStock: 1,
      })
    })
    expect(await screen.findByText('Ningún producto coincide con los filtros.')).toBeInTheDocument()
  })

  it('"Solo sin stock" deja solo los agotados', async () => {
    const app = await createTestApp()
    await renderProducts(app, '/productos?sinStock=1')

    await waitFor(() => {
      expect(rowNames()).toEqual(['Mate Galleta'])
    })
    expect(screen.getByRole('checkbox', { name: 'Solo sin stock' })).toBeChecked()
  })

  it('archiva un producto después de confirmar', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderProducts(app)
    await screen.findByRole('link', { name: 'Mate Galleta' })

    await user.click(screen.getByRole('button', { name: 'Acciones de Mate Galleta' }))
    expect(screen.getByRole('menuitem', { name: /Ver en la tienda/ })).toHaveAttribute(
      'href',
      'http://localhost:3000/producto/mate-galleta',
    )
    await user.click(screen.getByRole('menuitem', { name: 'Archivar' }))

    const dialog = await screen.findByRole('alertdialog', { name: '¿Archivar «Mate Galleta»?' })
    expect(
      within(dialog).getByText(
        'Deja de verse en la tienda y no se puede comprar. Se conserva con sus pedidos y lo podés volver a publicar.',
      ),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Archivar' }))

    expect(await screen.findByText('Producto archivado.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: 'Mate Galleta' })).not.toBeInTheDocument()
    })
    expect(app.mockDb.db.products.find((product) => product.id === 'prd-galleta')?.status).toBe(
      'archived',
    )
  })

  it('después de archivar el foco va al título; al cancelar vuelve al menú de la fila', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderProducts(app)
    await screen.findByRole('link', { name: 'Mate Galleta' })
    const menu = screen.getByRole('button', { name: 'Acciones de Mate Galleta' })

    await user.click(menu)
    await user.click(screen.getByRole('menuitem', { name: 'Archivar' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await waitFor(() => {
      expect(menu).toHaveFocus()
    })

    await user.click(menu)
    await user.click(screen.getByRole('menuitem', { name: 'Archivar' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Archivar «Mate Galleta»?' })
    await user.click(within(dialog).getByRole('button', { name: 'Archivar' }))

    // La fila (con el menú que abrió la confirmación) sale de la tabla: el foco no cae al body.
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Productos' })).toHaveFocus()
    })
    expect(screen.queryByRole('link', { name: 'Mate Galleta' })).not.toBeInTheDocument()
  })

  it('"Poco stock" se marca solo en los publicados', async () => {
    const app = await createTestApp()
    productInDb(app, 'Mate Coquito Criollo').status = 'draft'
    productInDb(app, 'Mate Imperial Premium').stock = 1
    await renderProducts(app)

    // El umbral sale de los ajustes: se espera a que carguen con un publicado que lo marca.
    await waitFor(() => {
      expect(within(rowOf('Mate Imperial Premium')).getByText('Poco stock')).toBeInTheDocument()
    })
    const draft = rowOf('Mate Coquito Criollo')
    expect(within(draft).getByText('Borrador')).toBeInTheDocument()
    expect(within(draft).queryByText('Poco stock')).not.toBeInTheDocument()
  })

  it('al archivar el último de la última página lo dice y lleva a la primera', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    const { router } = await renderProducts(app, '/productos?pagina=2')
    await waitFor(() => {
      expect(rowNames()).toHaveLength(3)
    })
    const [first, second, last] = rowNames()
    if (first === undefined || second === undefined || last === undefined) {
      throw new Error('Faltan los productos de la página 2.')
    }
    // Los dos primeros se archivan en otra pestaña; el último, desde la tabla.
    productInDb(app, first).status = 'archived'
    productInDb(app, second).status = 'archived'

    await user.click(screen.getByRole('button', { name: `Acciones de ${last}` }))
    await user.click(await screen.findByRole('menuitem', { name: 'Archivar' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Archivar' }))

    expect(await screen.findByText('Esta página ya no tiene productos.')).toBeInTheDocument()
    expect(screen.queryByText('Todavía no hay productos.')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Mostrando/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir a la primera página' }))
    await waitFor(() => {
      expect(router.state.location.search).toEqual({})
    })
    await waitFor(() => {
      expect(rowNames()).toHaveLength(24)
    })
  })

  it('una página que ya no existe lleva a la primera sin perder los filtros', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    const { router } = await renderProducts(app, '/productos?q=canarias&pagina=4')

    expect(await screen.findByText('Esta página ya no tiene productos.')).toBeInTheDocument()
    expect(screen.queryByText('Ningún producto coincide con los filtros.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ir a la primera página' }))

    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: 'canarias' })
    })
    await waitFor(() => {
      expect(rowNames()).toHaveLength(3)
    })
  })

  it('si la recarga en segundo plano falla, la tabla sigue con sus datos y avisa arriba', async () => {
    const app = await createTestApp()
    const user = userEvent.setup()
    await renderProducts(app)
    await screen.findByRole('link', { name: 'Mate Imperial Premium' })
    const session = app.mockDb.db.adminSession

    await failBackgroundReload(app)

    expect(rowNames()).toHaveLength(24)
    expect(screen.queryByText('No pudimos cargar los productos.')).not.toBeInTheDocument()
    expect(screen.getByText(STALE_LIST_ERROR)).toHaveAttribute('role', 'alert')

    app.mockDb.db.adminSession = session
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => {
      expect(screen.queryByText(STALE_LIST_ERROR)).not.toBeInTheDocument()
    })
    expect(rowNames()).toHaveLength(24)
  })

  it('sin productos invita a crear el primero', async () => {
    const app = await createTestApp()
    app.mockDb.db.products = []
    await renderProducts(app)

    expect(await screen.findByText('Todavía no hay productos.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear el primero' })).toHaveAttribute(
      'href',
      '/productos/nuevo',
    )
  })
})
