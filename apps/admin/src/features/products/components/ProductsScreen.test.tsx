import { useNavigate, useSearch } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
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
