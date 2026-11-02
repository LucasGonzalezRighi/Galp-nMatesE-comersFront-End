import type { ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import type { Order } from '@galpon/api-client'
import { adminOrdersQuery, useApiClient } from '@galpon/api-client/react'
import { formatDateTime, ORDER_STATUSES, PAYMENT_STATUSES } from '@galpon/domain'
import type { DataTableFeatures } from '../../../components/ui/DataTable'
import type { SelectOption } from '../../../components/ui/Select'
import type { OrdersSearch } from '../orders-search'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { buttonClass } from '../../../components/ui/button-class'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Field } from '../../../components/ui/Field'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { Select } from '../../../components/ui/Select'
import { TextInput } from '../../../components/ui/TextInput'
import { formatMoney } from '../order-format'
import {
  hasOrderFilters,
  ORDERS_TO_SHIP_FILTER,
  ordersSearchSchema,
  toAdminOrderQuery,
} from '../orders-search'
import { useOrdersSearchStore } from '../orders-search.store'
import { ORDERS_SEARCH_DEBOUNCE_MS, ORDERS_SEARCH_MAX_LENGTH } from '../orders.constants'
import {
  ORDER_STATUS_BADGES,
  ORDERS_COPY,
  PAYMENT_STATUS_BADGES,
  SHIPPING_METHOD_TEXT,
} from '../orders.copy'
import { useDebouncedValue } from '../use-debounced-value'

/** Props de {@link OrdersScreen}. */
export interface OrdersScreenProps {
  /** Filtros de la URL (`?estado=`, `?pago=`, `?pagina=`), ya validados por la ruta. */
  search: OrdersSearch
  /** Cambia los filtros de la URL. */
  onSearchChange: (search: OrdersSearch) => void
  /** URL de la tienda, para "Ver tienda" cuando todavía no hay pedidos. */
  storeUrl: string
}

/** Opciones de "Estado del pedido": todos, para despachar y cada estado. */
const ORDER_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: ORDERS_COPY.all },
  { value: ORDERS_TO_SHIP_FILTER, label: ORDERS_COPY.toShip },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_BADGES[status].label })),
]

/** Opciones de "Estado del pago": todos y cada estado. */
const PAYMENT_STATUS_OPTIONS: readonly SelectOption[] = [
  { value: '', label: ORDERS_COPY.all },
  ...PAYMENT_STATUSES.map((status) => ({
    value: status,
    label: PAYMENT_STATUS_BADGES[status].label,
  })),
]

const helper = createColumnHelper<DataTableFeatures, Order>()

/** Columnas de la tabla; Cliente, Pago y Envío se esconden en pantallas chicas. */
const COLUMNS = helper.columns([
  helper.accessor('number', {
    header: ORDERS_COPY.columns.number,
    cell: (info) => (
      <Link
        to="/pedidos/$numero"
        params={{ numero: info.getValue() }}
        className="text-accent-400 font-mono whitespace-nowrap underline-offset-2 hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor('createdAt', {
    header: ORDERS_COPY.columns.date,
    cell: (info) => formatDateTime(info.getValue()),
    meta: { className: 'whitespace-nowrap tabular-nums' },
  }),
  helper.accessor('customer', {
    header: ORDERS_COPY.columns.customer,
    cell: (info) => {
      const { firstName, lastName, email } = info.getValue()
      return (
        <span className="flex flex-col">
          <span>{`${firstName} ${lastName}`}</span>
          <span className="text-xs text-neutral-400">{email}</span>
        </span>
      )
    },
    meta: { hideBelow: 'md' },
  }),
  helper.accessor('totalArs', {
    header: ORDERS_COPY.columns.total,
    cell: (info) => formatMoney(info.getValue()),
    meta: { align: 'end', className: 'whitespace-nowrap tabular-nums' },
  }),
  helper.accessor('status', {
    header: ORDERS_COPY.columns.order,
    cell: (info) => {
      const badge = ORDER_STATUS_BADGES[info.getValue()]
      return <Badge tone={badge.tone}>{badge.label}</Badge>
    },
  }),
  helper.accessor('paymentStatus', {
    header: ORDERS_COPY.columns.payment,
    cell: (info) => {
      const badge = PAYMENT_STATUS_BADGES[info.getValue()]
      return <Badge tone={badge.tone}>{badge.label}</Badge>
    },
    meta: { hideBelow: 'sm' },
  }),
  helper.accessor((order) => order.shipping.method, {
    id: 'shipping',
    header: ORDERS_COPY.columns.shipping,
    cell: (info) => SHIPPING_METHOD_TEXT[info.getValue()],
    meta: { hideBelow: 'lg', className: 'whitespace-nowrap' },
  }),
])

/**
 * Pantalla `/pedidos`: filtros (búsqueda, estado del pedido y del pago), la tabla de pedidos de
 * a 20 y la paginación.
 *
 * Los filtros de estado y la página van en la URL (`search` / `onSearchChange`); la búsqueda por
 * texto (número, email o nombre) **no**: vive en `useOrdersSearchStore`, se aplica 300 ms después
 * de la última tecla y sobrevive a ir al detalle y volver.
 *
 * @param props - Ver {@link OrdersScreenProps}.
 */
export function OrdersScreen({ search, onSearchChange, storeUrl }: OrdersScreenProps): ReactNode {
  const api = useApiClient()
  const text = useOrdersSearchStore((state) => state.text)
  const setText = useOrdersSearchStore((state) => state.setText)
  const debouncedText = useDebouncedValue(text, ORDERS_SEARCH_DEBOUNCE_MS)
  const ordersQuery = useQuery({
    ...adminOrdersQuery(api, toAdminOrderQuery(search, debouncedText)),
    placeholderData: keepPreviousData,
  })
  const page = ordersQuery.data
  const isFiltered = hasOrderFilters(search, text)

  function clearFilters() {
    setText('')
    onSearchChange({})
  }

  const emptyState = isFiltered ? (
    <EmptyState
      title={ORDERS_COPY.noMatches}
      action={
        <Button variant="secondary" onClick={clearFilters}>
          {ORDERS_COPY.clearFilters}
        </Button>
      }
    />
  ) : (
    <EmptyState
      title={ORDERS_COPY.empty}
      description={ORDERS_COPY.emptyDescription}
      action={
        <a
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonClass('secondary', 'md')}
        >
          {ORDERS_COPY.viewStore}
        </a>
      }
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={ORDERS_COPY.listTitle} />
      <div className="bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6">
        <div
          role="search"
          aria-label={ORDERS_COPY.filtersLabel}
          className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <Field label={ORDERS_COPY.searchLabel} className="sm:col-span-2 lg:col-span-1">
            {(control) => (
              <TextInput
                {...control}
                type="search"
                value={text}
                maxLength={ORDERS_SEARCH_MAX_LENGTH}
                placeholder={ORDERS_COPY.searchPlaceholder}
                autoComplete="off"
                onChange={(event) => {
                  setText(event.target.value)
                  if (search.pagina !== undefined) onSearchChange({ ...search, pagina: undefined })
                }}
              />
            )}
          </Field>
          <Field label={ORDERS_COPY.orderStatusLabel}>
            {(control) => (
              <Select
                {...control}
                options={ORDER_STATUS_OPTIONS}
                value={search.estado ?? ''}
                onChange={(event) => {
                  onSearchChange({
                    ...search,
                    estado: ordersSearchSchema.shape.estado.parse(event.target.value),
                    pagina: undefined,
                  })
                }}
              />
            )}
          </Field>
          <Field label={ORDERS_COPY.paymentStatusLabel}>
            {(control) => (
              <Select
                {...control}
                options={PAYMENT_STATUS_OPTIONS}
                value={search.pago ?? ''}
                onChange={(event) => {
                  onSearchChange({
                    ...search,
                    pago: ordersSearchSchema.shape.pago.parse(event.target.value),
                    pagina: undefined,
                  })
                }}
              />
            )}
          </Field>
          {isFiltered && (
            <Button variant="ghost" onClick={clearFilters}>
              {ORDERS_COPY.clearFilters}
            </Button>
          )}
        </div>
        <DataTable
          caption={ORDERS_COPY.tableCaption}
          columns={COLUMNS}
          data={page?.items ?? []}
          getRowId={(order) => order.number}
          isLoading={ordersQuery.isPending}
          error={ordersQuery.isError ? ORDERS_COPY.listError : null}
          onRetry={() => {
            void ordersQuery.refetch()
          }}
          emptyState={emptyState}
        />
        {page !== undefined && (
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
    </div>
  )
}
