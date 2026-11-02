import type { ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useRef, useState } from 'react'
import type { AdminProduct } from '@galpon/api-client'
import {
  adminCategoriesQuery,
  adminProductsQuery,
  adminSettingsQuery,
  useApiClient,
} from '@galpon/api-client/react'
import type { ActionsMenuItem } from '../../../components/ui/ActionsMenu'
import type { DataTableFeatures } from '../../../components/ui/DataTable'
import type { ProductsSearch } from '../products-search'
import { ActionsMenu } from '../../../components/ui/ActionsMenu'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { buttonClass } from '../../../components/ui/button-class'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { toast } from '../../../components/ui/toast'
import { priceText, stockBadge } from '../product-format'
import {
  hasProductFilters,
  orderOfSorting,
  sortingOfOrder,
  toAdminProductQuery,
} from '../products-search'
import { actionsLabel, archiveTitle, PRODUCT_STATUS_BADGES, PRODUCTS_COPY } from '../products.copy'
import { useArchiveProduct } from '../use-archive-product'
import { ProductsFilters } from './ProductsFilters'
import { ProductThumb } from './ProductThumb'

/** Props de {@link ProductsScreen}. */
export interface ProductsScreenProps {
  /** Filtros de la URL, ya validados por la ruta. */
  search: ProductsSearch
  /** Cambia los filtros de la URL. */
  onSearchChange: (search: ProductsSearch) => void
  /** URL de la tienda, para "Ver en la tienda". */
  storeUrl: string
}

/**
 * Columna que la tabla da por ordenada sin `?orden=`: el orden por código no tiene columna propia,
 * así que ningún encabezado queda marcado.
 */
const CODE_ORDER_COLUMN = 'sequence'

/** Lo que necesitan las columnas además de cada fila. */
interface ColumnOptions {
  /** URL de la tienda. */
  storeUrl: string
  /** Umbral de poco stock de los ajustes, o `null` mientras cargan. */
  lowStockThreshold: number | null
  /** Abre la confirmación para archivar. */
  onArchive: (product: AdminProduct) => void
}

const helper = createColumnHelper<DataTableFeatures, AdminProduct>()

/**
 * Acciones del menú de una fila: "Editar", "Ver en la tienda" (solo publicados) y "Archivar" (no
 * archivados).
 */
function rowActions(product: AdminProduct, options: ColumnOptions): ActionsMenuItem[] {
  const items: ActionsMenuItem[] = [{ label: PRODUCTS_COPY.edit, href: `/productos/${product.id}` }]
  if (product.status === 'published') {
    items.push({
      label: PRODUCTS_COPY.viewInStore,
      href: `${options.storeUrl}/producto/${product.slug}`,
      external: true,
    })
  }
  if (product.status !== 'archived') {
    items.push({
      label: PRODUCTS_COPY.archive,
      tone: 'danger',
      onSelect: () => {
        options.onArchive(product)
      },
    })
  }
  return items
}

/** Columnas de la tabla; Línea y Estado se esconden en pantallas chicas. */
function productColumns(options: ColumnOptions) {
  return helper.columns([
    helper.accessor('mainImage', {
      id: 'photo',
      header: PRODUCTS_COPY.columns.photo,
      cell: (info) => <ProductThumb image={info.getValue()} />,
      meta: { className: 'w-14' },
    }),
    helper.accessor('name', {
      header: PRODUCTS_COPY.columns.product,
      enableSorting: true,
      cell: (info) => {
        const product = info.row.original
        return (
          <span className="flex flex-col gap-1">
            <Link
              to="/productos/$id"
              params={{ id: product.id }}
              className="text-accent-400 underline-offset-2 hover:underline"
            >
              {product.name}
            </Link>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-400 tabular-nums">{product.code}</span>
              {product.featured && <Badge tone="accent">{PRODUCTS_COPY.featured}</Badge>}
            </span>
          </span>
        )
      },
    }),
    helper.accessor('categoryName', {
      header: PRODUCTS_COPY.columns.line,
      meta: { hideBelow: 'md', className: 'whitespace-nowrap' },
    }),
    helper.accessor('priceArs', {
      id: 'price',
      header: PRODUCTS_COPY.columns.price,
      enableSorting: true,
      cell: (info) => priceText(info.getValue()),
      meta: { align: 'end', className: 'whitespace-nowrap tabular-nums' },
    }),
    helper.accessor('stock', {
      header: PRODUCTS_COPY.columns.stock,
      cell: (info) => {
        const badge = stockBadge(
          info.getValue(),
          options.lowStockThreshold,
          info.row.original.status,
        )
        return (
          <span className="inline-flex items-center gap-2">
            <span className="tabular-nums">{info.getValue()}</span>
            {badge !== null && <Badge tone={badge.tone}>{badge.label}</Badge>}
          </span>
        )
      },
      meta: { className: 'whitespace-nowrap' },
    }),
    helper.accessor('status', {
      header: PRODUCTS_COPY.columns.status,
      cell: (info) => {
        const badge = PRODUCT_STATUS_BADGES[info.getValue()]
        return <Badge tone={badge.tone}>{badge.label}</Badge>
      },
      meta: { hideBelow: 'sm' },
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">{PRODUCTS_COPY.columns.actions}</span>,
      cell: (info) => (
        <ActionsMenu
          label={actionsLabel(info.row.original.name)}
          items={rowActions(info.row.original, options)}
        />
      ),
      meta: { align: 'end' },
    }),
  ])
}

/**
 * Pantalla `/productos`: "Nuevo producto", los filtros (en la URL), la tabla de a 24 con su orden
 * y la paginación. "Archivar" pide confirmación y avisa "Producto archivado."; después de archivar
 * el foco va al `h1` (la fila, con su menú, puede salir de la tabla), y al cancelar vuelve al menú.
 *
 * Una `?pagina=` más allá de la última (por ejemplo, después de archivar el último producto de la
 * última página) muestra "Esta página ya no tiene productos." con "Ir a la primera página" (no
 * redirige sola: `onSearchChange` agrega una entrada al historial y "Atrás" volvería a la página
 * vacía, que redirigiría otra vez). Si una recarga en segundo plano falla, la tabla sigue con lo
 * último que cargó y arriba se avisa, con "Reintentar".
 *
 * @param props - Ver {@link ProductsScreenProps}.
 */
export function ProductsScreen({
  search,
  onSearchChange,
  storeUrl,
}: ProductsScreenProps): ReactNode {
  const api = useApiClient()
  const productsQuery = useQuery({
    ...adminProductsQuery(api, toAdminProductQuery(search)),
    placeholderData: keepPreviousData,
  })
  const categoriesQuery = useQuery(adminCategoriesQuery(api))
  const settingsQuery = useQuery(adminSettingsQuery(api))
  const lowStockThreshold = settingsQuery.data?.lowStockThreshold ?? null
  const archive = useArchiveProduct()
  const [archiveTarget, setArchiveTarget] = useState<AdminProduct | null>(null)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Si se archivó, el foco va al título al cerrar la confirmación; si no, vuelve al menú de la fila.
  // Se lee y se limpia al cerrar, así la próxima confirmación arranca sin archivar.
  const archivedRef = useRef(false)
  const columns = useMemo(
    () =>
      productColumns({
        storeUrl,
        lowStockThreshold,
        onArchive: (product) => {
          setArchiveTarget(product)
          setIsArchiveOpen(true)
        },
      }),
    [storeUrl, lowStockThreshold],
  )
  const page = productsQuery.data
  const sorting = sortingOfOrder(search.orden)
  // Una página vacía con productos en total es una `?pagina=` fuera de rango.
  const isPastLastPage = page?.items.length === 0 && page.total > 0
  // El error reemplaza a la tabla solo si nunca hubo datos; si no, se avisa arriba.
  const isStale = productsQuery.isError && page !== undefined

  function clearFilters() {
    onSearchChange({ orden: search.orden })
  }

  /** Vacío de la tabla: página fuera de rango, sin coincidencias o sin productos. */
  function renderEmptyState(): ReactNode {
    if (isPastLastPage) {
      return (
        <EmptyState
          title={PRODUCTS_COPY.pastLastPage}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                onSearchChange({ ...search, pagina: undefined })
              }}
            >
              {PRODUCTS_COPY.firstPage}
            </Button>
          }
        />
      )
    }
    if (hasProductFilters(search)) {
      return (
        <EmptyState
          title={PRODUCTS_COPY.noMatches}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {PRODUCTS_COPY.clearFilters}
            </Button>
          }
        />
      )
    }
    return (
      <EmptyState
        title={PRODUCTS_COPY.empty}
        action={
          <Link to="/productos/nuevo" className={buttonClass('primary', 'md')}>
            {PRODUCTS_COPY.createFirst}
          </Link>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        headingRef={headingRef}
        title={PRODUCTS_COPY.listTitle}
        actions={
          <Link to="/productos/nuevo" className={buttonClass('primary', 'md')}>
            {PRODUCTS_COPY.newProduct}
          </Link>
        }
      />
      <div className="bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6">
        <ProductsFilters
          search={search}
          onSearchChange={onSearchChange}
          categories={categoriesQuery.data ?? []}
        />
        {isStale && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-danger text-sm">
              {PRODUCTS_COPY.staleListError}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void productsQuery.refetch()
              }}
            >
              {PRODUCTS_COPY.retry}
            </Button>
          </div>
        )}
        <DataTable
          caption={PRODUCTS_COPY.tableCaption}
          columns={columns}
          data={page?.items ?? []}
          getRowId={(product) => product.id}
          isLoading={productsQuery.isPending}
          error={productsQuery.isError && page === undefined ? PRODUCTS_COPY.listError : null}
          onRetry={() => {
            void productsQuery.refetch()
          }}
          emptyState={renderEmptyState()}
          sorting={{
            columnId: sorting?.columnId ?? CODE_ORDER_COLUMN,
            direction: sorting?.direction ?? 'asc',
            onChange: (columnId, direction) => {
              onSearchChange({
                ...search,
                orden: orderOfSorting(columnId, direction),
                pagina: undefined,
              })
            },
          }}
        />
        {page !== undefined && !isPastLastPage && (
          <Pagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            onPageChange={(next) => {
              onSearchChange({ ...search, pagina: next === 1 ? undefined : next })
            }}
          />
        )}
      </div>
      {archiveTarget !== null && (
        <ConfirmDialog
          open={isArchiveOpen}
          onOpenChange={setIsArchiveOpen}
          title={archiveTitle(archiveTarget.name)}
          description={PRODUCTS_COPY.archiveDescription}
          confirmLabel={PRODUCTS_COPY.archive}
          tone="danger"
          isPending={archive.isPending}
          returnFocusTo={() => {
            const archived = archivedRef.current
            archivedRef.current = false
            return archived ? headingRef.current : null
          }}
          onConfirm={() => {
            archive.mutate(archiveTarget.id, {
              onSuccess: () => {
                archivedRef.current = true
                toast.success(PRODUCTS_COPY.archived)
              },
              onSettled: () => {
                setIsArchiveOpen(false)
              },
            })
          }}
        />
      )}
    </div>
  )
}
