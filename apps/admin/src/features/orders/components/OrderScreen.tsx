import type { ReactNode } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useRef } from 'react'
import type { Order } from '@galpon/api-client'
import { isApiError } from '@galpon/api-client'
import { adminDashboardQuery, adminOrderQuery, useApiClient } from '@galpon/api-client/react'
import { formatDateTime, isOrderNumber } from '@galpon/domain'
import { Badge } from '../../../components/ui/Badge'
import { buttonClass } from '../../../components/ui/button-class'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { formatTimeOfDay } from '../order-format'
import {
  createdAtText,
  ORDER_STATUS_BADGES,
  orderNotFound,
  orderTitle,
  ORDERS_COPY,
  PAYMENT_STATUS_BADGES,
  reservedUntilText,
} from '../orders.copy'
import { OrderDetailSections } from './OrderDetailSections'
import { OrderStatusActions } from './OrderStatusActions'

/** Props de {@link OrderScreen}. */
export interface OrderScreenProps {
  /** Número del pedido, tal como viene en la dirección (`/pedidos/$numero`). */
  number: string
}

/** Enlace "Pedidos" del encabezado. */
const BACK = { to: '/pedidos', label: ORDERS_COPY.back } as const

/** Avisos de pago del pedido: contracargo y mediación por su estado, pago duplicado por el resumen. */
function paymentAlerts(order: Order, duplicates: readonly string[]): string[] {
  const alerts: string[] = []
  if (order.paymentStatus === 'charged_back') alerts.push(ORDERS_COPY.chargedBack)
  if (order.paymentStatus === 'in_dispute') alerts.push(ORDERS_COPY.inDispute)
  return [...alerts, ...duplicates]
}

/**
 * Mientras carga el detalle: "Cargando el pedido…" oculto (`role="status"`, se anuncia) y la
 * forma decorativa de las secciones.
 */
function OrderSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {ORDERS_COPY.detailLoading}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Pantalla `/pedidos/$numero`: encabezado con la fecha, los badges del pedido y del pago y las
 * acciones de `OrderStatusActions`; los avisos de pago (contracargo, mediación y el pago
 * duplicado que trae el resumen) y las secciones del pedido. Un número que no existe (o que no
 * tiene el formato `GLP-` y cinco dígitos) muestra "No encontramos el pedido {número}.".
 *
 * @param props - Ver {@link OrderScreenProps}.
 */
export function OrderScreen({ number }: OrderScreenProps): ReactNode {
  const api = useApiClient()
  const isValid = isOrderNumber(number)
  const orderQuery = useQuery({ ...adminOrderQuery(api, number), enabled: isValid })
  const dashboardQuery = useQuery({ ...adminDashboardQuery(api), enabled: isValid })
  const headingRef = useRef<HTMLHeadingElement>(null)
  const title = orderTitle(number)

  const notFound =
    !isValid ||
    (orderQuery.isError && isApiError(orderQuery.error) && orderQuery.error.kind === 'not_found')
  if (notFound) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={title} back={BACK} />
        <div className="bg-surface rounded-lg shadow-sm">
          <EmptyState
            title={orderNotFound(number)}
            action={
              <Link to="/pedidos" className={buttonClass('secondary', 'md')}>
                {ORDERS_COPY.backToList}
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const order = orderQuery.data
  if (order === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={title} back={BACK} />
        {orderQuery.isError ? (
          <div className="bg-surface rounded-lg shadow-sm">
            <ErrorState
              title={ORDERS_COPY.detailError}
              description={isApiError(orderQuery.error) ? orderQuery.error.message : undefined}
              onRetry={() => {
                void orderQuery.refetch()
              }}
            />
          </div>
        ) : (
          <OrderSkeleton />
        )}
      </div>
    )
  }

  const orderBadge = ORDER_STATUS_BADGES[order.status]
  const paymentBadge = PAYMENT_STATUS_BADGES[order.paymentStatus]
  const duplicates = (dashboardQuery.data?.paymentAlerts ?? [])
    .filter((alert) => alert.orderNumber === order.number && alert.kind === 'duplicate_payment')
    .map((alert) => alert.message)
  const alerts = paymentAlerts(order, duplicates)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        headingRef={headingRef}
        title={title}
        back={BACK}
        description={
          <div className="flex flex-col gap-2">
            <p className="tabular-nums">{createdAtText(formatDateTime(order.createdAt))}</p>
            <p className="flex flex-wrap gap-2">
              <Badge tone={orderBadge.tone}>{orderBadge.label}</Badge>
              <Badge tone={paymentBadge.tone}>{paymentBadge.label}</Badge>
            </p>
            {order.status === 'pending_payment' && (
              <p className="tabular-nums">
                {reservedUntilText(formatTimeOfDay(order.reservedUntil))}
              </p>
            )}
          </div>
        }
        actions={<OrderStatusActions order={order} focusAfterChange={() => headingRef.current} />}
      />
      {alerts.map((alert) => (
        <div
          key={alert}
          role="alert"
          className="border-danger-border flex items-start gap-3 rounded-lg border p-4 text-sm"
        >
          <WarningCircleIcon
            size={18}
            weight="regular"
            aria-hidden="true"
            className="text-danger mt-0.5 shrink-0"
          />
          <p>{alert}</p>
        </div>
      ))}
      <OrderDetailSections order={order} />
    </div>
  )
}
