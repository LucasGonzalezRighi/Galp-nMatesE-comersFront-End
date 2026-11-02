'use client'

import type { ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import type { OrderSummaryPage } from '@galpon/api-client'
import { Button, Tag } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { myOrdersQuery, useApiClient } from '@galpon/api-client/react'
import { formatDate, formatPesos, pesos, pluralize } from '@galpon/domain'
import { ACCOUNT_COPY, ORDER_STATUS_LABELS } from './account.copy'
import { FormError } from './form-parts'

/** Props de {@link OrdersList}. */
export interface OrdersListProps {
  /** Primera página de pedidos, leída en el servidor con la sesión del cliente. */
  initialPage: OrderSummaryPage
}

const COPY = ACCOUNT_COPY.orders

/** Estado vacío: todavía no hay pedidos. */
function EmptyOrders(): ReactNode {
  return (
    <div className="bg-surface flex flex-col items-start gap-3 rounded-lg p-[clamp(20px,3vw,32px)] shadow-sm">
      <p className="m-0 text-[18px]">{COPY.empty}</p>
      <p className="m-0 text-[14px] text-neutral-400">{COPY.emptyText}</p>
      <Button asChild variant="secondary">
        <Link href={asRoute('/tienda')}>{COPY.shop}</Link>
      </Button>
    </div>
  )
}

/**
 * Listado de "Mis pedidos" (`/cuenta/pedidos`): número, fecha, cantidad de productos, estado y
 * total de cada pedido, del más nuevo al más viejo, con enlace al detalle; de a 10 por página.
 * La primera página llega del servidor; las demás se piden con TanStack Query. Sin pedidos
 * muestra "Todavía no hiciste pedidos" y el acceso a la tienda (spec 9.7).
 *
 * @param props - Ver {@link OrdersListProps}.
 */
export function OrdersList({ initialPage }: OrdersListProps): ReactNode {
  const api = useApiClient()
  const [page, setPage] = useState(initialPage.page)
  const query = useQuery({
    ...myOrdersQuery(api, page),
    initialData: () => (page === initialPage.page ? initialPage : undefined),
    placeholderData: keepPreviousData,
  })
  const data = query.data
  const pages = data === undefined ? 1 : Math.max(1, Math.ceil(data.total / data.pageSize))

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-[clamp(32px,4vw,52px)] leading-none tracking-[-0.03em]">{COPY.title}</h1>
      {data === undefined ? (
        query.isError ? (
          <div className="flex flex-col items-start gap-3">
            <FormError message={COPY.loadError} />
            <Button
              variant="secondary"
              onClick={() => {
                void query.refetch()
              }}
            >
              {COPY.retry}
            </Button>
          </div>
        ) : null
      ) : data.total === 0 ? (
        <EmptyOrders />
      ) : (
        <>
          <ul aria-busy={query.isFetching} className="m-0 flex list-none flex-col gap-3 p-0">
            {data.items.map((order) => (
              <li key={order.number}>
                <Link
                  href={asRoute(`/cuenta/pedidos/${order.number}`)}
                  className="bg-surface hover:bg-foreground/5 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg p-[clamp(16px,2.4vw,22px)] shadow-sm transition-colors"
                >
                  <span className="text-[16px] tabular-nums">{order.number}</span>
                  <span className="text-[16px] tabular-nums">
                    {formatPesos(pesos(order.totalArs))}
                  </span>
                  <span className="text-[13px] text-neutral-400">
                    {formatDate(order.createdAt)} ·{' '}
                    {pluralize(order.itemCount, COPY.product, COPY.products)}
                  </span>
                  <Tag variant="outline" className="justify-self-end">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Tag>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1)
                }}
              >
                {COPY.previous}
              </Button>
              <span className="text-[13px] text-neutral-400">{COPY.pageOf(page, pages)}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => {
                  setPage(page + 1)
                }}
              >
                {COPY.next}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
