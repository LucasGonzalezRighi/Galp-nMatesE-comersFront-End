import { createColumnHelper } from '@tanstack/react-table'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DataTableFeatures, DataTableProps } from './DataTable'
import { DataTable } from './DataTable'

interface Product {
  id: string
  name: string
  category: string
  price: number
}

const helper = createColumnHelper<DataTableFeatures, Product>()

const columns = helper.columns([
  helper.accessor('name', { header: 'Producto', enableSorting: true }),
  helper.accessor('category', { header: 'Línea', meta: { hideBelow: 'md' } }),
  helper.accessor('price', {
    header: 'Precio',
    enableSorting: true,
    meta: { align: 'end', className: 'tabular-nums' },
  }),
])

const products: Product[] = [
  { id: 'p1', name: 'Mate imperial', category: 'Mates', price: 39999 },
  { id: 'p2', name: 'Bombilla pico de loro', category: 'Bombillas', price: 12000 },
]

/** Encabezado (`th`) que contiene el botón de orden con ese nombre. */
function sortableHeader(buttonName: string): HTMLElement | null {
  return screen.getByRole('button', { name: buttonName }).closest('th')
}

function renderTable(props: Partial<DataTableProps<Product>> = {}) {
  return render(
    <DataTable
      caption="Productos"
      columns={columns}
      data={products}
      getRowId={(product) => product.id}
      isLoading={false}
      error={null}
      onRetry={vi.fn()}
      emptyState={<p>Todavía no hay productos.</p>}
      {...props}
    />,
  )
}

describe('DataTable', () => {
  it('dibuja la tabla con su caption, encabezados y filas', () => {
    renderTable()

    const table = screen.getByRole('table', { name: 'Productos' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Producto', 'Línea', 'Precio'])
    expect(within(table).getByRole('row', { name: /Mate imperial/ })).toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('39999')).toHaveClass('text-right', 'tabular-nums')
  })

  it('esconde las columnas secundarias bajo su breakpoint (encabezado y celdas)', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: 'Línea' })).toHaveClass(
      'hidden',
      'md:table-cell',
    )
    expect(screen.getByText('Mates')).toHaveClass('hidden', 'md:table-cell')
  })

  it('los encabezados ordenables son botones con aria-sort y "Ordenar por {columna}"', () => {
    renderTable({ sorting: { columnId: 'price', direction: 'asc', onChange: vi.fn() } })

    expect(screen.getByRole('button', { name: 'Ordenar por Producto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ordenar por Precio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ordenar por Línea' })).not.toBeInTheDocument()
    expect(sortableHeader('Ordenar por Precio')).toHaveAttribute('aria-sort', 'ascending')
    expect(sortableHeader('Ordenar por Producto')).toHaveAttribute('aria-sort', 'none')
    expect(screen.getByRole('columnheader', { name: 'Línea' })).not.toHaveAttribute('aria-sort')
  })

  it('los íconos de orden miden 18 px', () => {
    renderTable({ sorting: { columnId: 'price', direction: 'asc', onChange: vi.fn() } })

    for (const name of ['Ordenar por Producto', 'Ordenar por Precio']) {
      const icon = screen.getByRole('button', { name }).querySelector('svg')
      expect(icon).toHaveAttribute('width', '18')
      expect(icon).toHaveAttribute('height', '18')
    }
  })

  it('ordenar llama a onChange: la columna activa invierte el sentido y otra arranca ascendente', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderTable({ sorting: { columnId: 'price', direction: 'asc', onChange } })

    await user.click(screen.getByRole('button', { name: 'Ordenar por Precio' }))
    expect(onChange).toHaveBeenLastCalledWith('price', 'desc')

    await user.click(screen.getByRole('button', { name: 'Ordenar por Producto' }))
    expect(onChange).toHaveBeenLastCalledWith('name', 'asc')
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('sin columna activa, aria-sort es descending si el orden activo es descendente', () => {
    renderTable({ sorting: { columnId: 'name', direction: 'desc', onChange: vi.fn() } })

    expect(sortableHeader('Ordenar por Producto')).toHaveAttribute('aria-sort', 'descending')
  })

  it('cargando: 5 filas de bloques con pulso y la tabla ocupada', () => {
    const { container } = renderTable({ isLoading: true, data: [] })

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    const rows = container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(5)
    expect(rows[0]?.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })

  it('error: una fila con role="alert", el mensaje y "Reintentar"', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderTable({ error: 'No pudimos cargar los productos.', onRetry })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar los productos.')
    expect(alert.closest('td')).toHaveAttribute('colspan', '3')
    expect(screen.queryByText('Mate imperial')).not.toBeInTheDocument()

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('vacío: muestra emptyState en una fila de ancho completo', () => {
    renderTable({ data: [] })

    expect(screen.getByText('Todavía no hay productos.').closest('td')).toHaveAttribute(
      'colspan',
      '3',
    )
  })

  it('tiene un contenedor con scroll horizontal propio que se alcanza con el teclado', async () => {
    const user = userEvent.setup()
    renderTable()

    const region = screen.getByRole('region', { name: 'Productos' })
    expect(region).toBe(screen.getByRole('table').parentElement)
    expect(region).toHaveClass('overflow-x-auto', 'focus-visible:outline-2')
    expect(region).toHaveAttribute('tabindex', '0')

    await user.tab()
    expect(region).toHaveFocus()
  })
})
