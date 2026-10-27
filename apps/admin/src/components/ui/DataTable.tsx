import type { ColumnDef, RowData, SortDirection } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, CaretUpDownIcon } from '@phosphor-icons/react'
import { rowSortingFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Button } from './Button'
import { cx } from './cx'
import { OVERLAY_COPY, sortBy } from './overlay.copy'

/** Ancho desde el que se muestra una columna secundaria (por debajo se esconde). */
export type DataTableBreakpoint = 'sm' | 'md' | 'lg'

/** Datos extra de cada columna (`meta` de la definición de TanStack Table). */
export interface DataTableColumnMeta {
  /** Esconde la columna (encabezado y celdas) por debajo de este ancho. */
  hideBelow?: DataTableBreakpoint
  /** Clases extra de las celdas, por ejemplo `tabular-nums` o `font-mono`. */
  className?: string
  /** `end` alinea a la derecha (montos y cifras). */
  align?: 'end'
}

/**
 * Funciones de TanStack Table que usa {@link DataTable}: solo el orden, manual (lo hace la API),
 * y el tipo de `meta` de las columnas.
 */
const columnMeta: DataTableColumnMeta = {}
const features = tableFeatures({ rowSortingFeature, columnMeta })

/**
 * Tipo de las funciones de la tabla, para armar las columnas con
 * `createColumnHelper<DataTableFeatures, Fila>()`.
 */
export type DataTableFeatures = typeof features

/** Por omisión ninguna columna se ordena: cada una lo pide con `enableSorting: true`. */
const DEFAULT_COLUMN = { enableSorting: false }

/** Orden activo de la tabla, controlado desde afuera (por ejemplo, desde la URL). */
export interface DataTableSorting {
  /** Columna por la que se ordena. */
  columnId: string
  /** Sentido del orden. */
  direction: SortDirection
  /** Se llama al tocar un encabezado ordenable: la columna activa invierte el sentido; otra arranca ascendente. */
  onChange: (columnId: string, direction: SortDirection) => void
}

/** Props de {@link DataTable}. */
export interface DataTableProps<T extends RowData> {
  /** Nombre de la tabla (va en un `<caption>` oculto), por ejemplo "Productos". */
  caption: string
  /** Columnas, armadas con `createColumnHelper<DataTableFeatures, T>()`. */
  columns: readonly ColumnDef<DataTableFeatures, T>[]
  /** Filas de la página actual. */
  data: readonly T[]
  /** Identificador estable de cada fila. */
  getRowId: (row: T) => string
  /** Primera carga: 5 filas de bloques con pulso. */
  isLoading: boolean
  /** Mensaje de error de la feature, o `null`. */
  error: string | null
  /** Se llama con "Reintentar". */
  onRetry: () => void
  /** Qué se muestra si no hay filas (un `EmptyState` con una acción). */
  emptyState: ReactNode
  /** Orden controlado; sin él, ningún encabezado se puede tocar. */
  sorting?: DataTableSorting
}

/** Cantidad de filas del estado de carga. */
const SKELETON_ROWS = 5

/** Clases para esconder una columna por debajo de cada ancho (escritas enteras para Tailwind). */
const HIDE_BELOW_CLASSES: Record<DataTableBreakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}

/**
 * Clases de disposición de una columna según su `meta`.
 *
 * @param meta - Datos extra de la columna.
 * @returns Las clases para esconderla y alinearla.
 */
function columnClass(meta: DataTableColumnMeta | undefined): string {
  return cx(
    meta?.hideBelow === undefined ? undefined : HIDE_BELOW_CLASSES[meta.hideBelow],
    meta?.align === 'end' ? 'text-right' : 'text-left',
  )
}

/** Valor de `aria-sort` de cada sentido. */
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

/**
 * Tabla de datos con TanStack Table 9 y orden manual (lo resuelve la API). Tiene `<caption>`
 * oculta, encabezados ordenables como botones con `aria-sort`, columnas secundarias que se
 * esconden en pantallas chicas y su propio scroll horizontal. Muestra los estados de carga
 * (5 filas con pulso), error (una fila con `role="alert"` y "Reintentar") y vacío
 * (`emptyState`).
 *
 * @param props - Ver {@link DataTableProps}.
 * @example
 * const helper = createColumnHelper<DataTableFeatures, AdminProduct>()
 * const columns = helper.columns([
 *   helper.accessor('name', { header: 'Producto', enableSorting: true }),
 *   helper.accessor('stock', { header: 'Stock', meta: { align: 'end', hideBelow: 'md' } }),
 * ])
 * <DataTable caption="Productos" columns={columns} data={rows} getRowId={(row) => row.id} … />
 */
export function DataTable<T extends RowData>({
  caption,
  columns,
  data,
  getRowId,
  isLoading,
  error,
  onRetry,
  emptyState,
  sorting,
}: DataTableProps<T>): ReactNode {
  const sortColumnId = sorting?.columnId
  const sortDirection = sorting?.direction
  const sortingState = useMemo(
    () =>
      sortColumnId === undefined ? [] : [{ id: sortColumnId, desc: sortDirection === 'desc' }],
    [sortColumnId, sortDirection],
  )
  const table = useTable({
    features,
    columns,
    data,
    getRowId,
    defaultColumn: DEFAULT_COLUMN,
    manualSorting: true,
    enableSorting: sorting !== undefined,
    enableMultiSort: false,
    state: { sorting: sortingState },
  })
  const leafColumns = table.getAllLeafColumns()
  const columnCount = leafColumns.length

  let body: ReactNode
  if (isLoading) {
    body = Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
      <tr key={rowIndex} className="border-divider border-t">
        {leafColumns.map((column) => (
          <td key={column.id} className={cx('px-4 py-3', columnClass(column.columnDef.meta))}>
            <span className="bg-foreground/10 block h-4 w-full max-w-32 animate-pulse rounded-sm motion-reduce:animate-none" />
          </td>
        ))}
      </tr>
    ))
  } else if (error !== null) {
    body = (
      <tr className="border-divider border-t">
        <td colSpan={columnCount} className="px-4 py-6">
          <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <p className="text-danger">{error}</p>
            <Button variant="secondary" onClick={onRetry}>
              {OVERLAY_COPY.retry}
            </Button>
          </div>
        </td>
      </tr>
    )
  } else if (data.length === 0) {
    body = (
      <tr className="border-divider border-t">
        <td colSpan={columnCount} className="px-4 py-6">
          {emptyState}
        </td>
      </tr>
    )
  } else {
    body = table.getRowModel().rows.map((row) => (
      <tr key={row.id} className="border-divider border-t">
        {row.getAllCells().map((cell) => (
          <td
            key={cell.id}
            className={cx(
              'px-4 py-3 align-middle',
              columnClass(cell.column.columnDef.meta),
              cell.column.columnDef.meta?.className,
            )}
          >
            <table.FlexRender cell={cell} />
          </td>
        ))}
      </tr>
    ))
  }

  return (
    <div className="overflow-x-auto">
      <table aria-busy={isLoading ? true : undefined} className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const { column } = header
                const meta = column.columnDef.meta
                const canSort = sorting !== undefined && column.getCanSort()
                const sorted = column.getIsSorted()
                const name =
                  typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id
                const SortIcon =
                  sorted === 'asc'
                    ? ArrowUpIcon
                    : sorted === 'desc'
                      ? ArrowDownIcon
                      : CaretUpDownIcon
                return (
                  <th
                    key={header.id}
                    scope="col"
                    colSpan={header.colSpan}
                    aria-sort={
                      canSort ? (sorted === false ? 'none' : ARIA_SORT[sorted]) : undefined
                    }
                    className={cx(
                      'text-foreground/70 px-4 py-2 text-xs font-medium whitespace-nowrap',
                      columnClass(meta),
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        aria-label={sortBy(name)}
                        onClick={() => {
                          sorting.onChange(column.id, sorted === 'asc' ? 'desc' : 'asc')
                        }}
                        className={cx(
                          'hover:text-foreground focus-visible:outline-accent -mx-2 inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md px-2 focus-visible:outline-2 focus-visible:outline-offset-2',
                          meta?.align === 'end' && 'flex-row-reverse',
                          sorted !== false && 'text-foreground',
                        )}
                      >
                        <table.FlexRender header={header} />
                        <SortIcon size={14} weight="regular" aria-hidden="true" />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  )
}
