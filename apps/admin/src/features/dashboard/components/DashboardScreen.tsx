import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { DashboardSummary } from '@galpon/api-client'
import { adminDashboardQuery, adminSettingsQuery, useApiClient } from '@galpon/api-client/react'
import { formatLongDate, formatPesos, pesos } from '@galpon/domain'
import { buttonClass } from '../../../components/ui/button-class'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { capitalizeFirst } from '../capitalize'
import { DASHBOARD_COPY } from '../dashboard.copy'
import { DashboardSkeleton } from './DashboardSkeleton'
import { LowStockSection } from './LowStockSection'
import { PaymentAlertsSection } from './PaymentAlertsSection'
import { StatCard } from './StatCard'

/** Props de {@link DashboardScreen}. */
export interface DashboardScreenProps {
  /** `true` con la API simulada: muestra la nota del modo de prueba. */
  isMockMode: boolean
  /**
   * El día que se muestra en el encabezado, fijo. Por omisión, hoy: se vuelve a calcular cada
   * minuto y al volver a la pestaña, así la fecha no queda vieja después de medianoche.
   */
  today?: Date
}

/** Cada cuánto se vuelve a calcular la fecha de hoy (1 minuto). */
const TODAY_REFRESH_MS = 60_000

/** La fecha larga con mayúscula inicial, por ejemplo "Martes 27 de octubre". */
function longDateLabel(day: Date): string {
  return capitalizeFirst(formatLongDate(day.toISOString()))
}

/**
 * La fecha del encabezado: la de `today` si viene; si no, la de hoy, que se vuelve a calcular cada
 * minuto y cuando la pestaña vuelve a estar visible (`visibilitychange`).
 */
function useTodayLabel(today: Date | undefined): string {
  // Se guarda el texto (no la fecha): si el día no cambió, el intervalo no vuelve a dibujar.
  const [currentLabel, setCurrentLabel] = useState(() => longDateLabel(new Date()))
  const isFixed = today !== undefined
  useEffect(() => {
    if (isFixed) return
    function refresh() {
      setCurrentLabel(longDateLabel(new Date()))
    }
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refresh()
    }
    const interval = setInterval(refresh, TODAY_REFRESH_MS)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [isFixed])
  return today === undefined ? currentLabel : longDateLabel(today)
}

/** Búsqueda de `/pedidos` con los pedidos para despachar (pagados o en preparación). */
const ORDERS_TO_SHIP_SEARCH = { estado: 'para-despachar' } as const

/**
 * Búsqueda de `/mensajes` con los mensajes sin leer, desde la primera página (la ruta saca de la
 * URL los valores por omisión: queda `?sinLeer=1`).
 */
const UNREAD_MESSAGES_SEARCH = { sinLeer: 1, pagina: 1 } as const

/** Búsqueda de `/resenas` en la pestaña de pendientes, la primera página (la URL queda limpia). */
const PENDING_REVIEWS_SEARCH = { estado: 'pendientes', pagina: 1 } as const

/** Props de {@link SummaryContent}. */
interface SummaryContentProps {
  summary: DashboardSummary
  lowStockThreshold: number
}

/** Las cifras, las alertas de pago y el poco stock, ya cargados. */
function SummaryContent({ summary, lowStockThreshold }: SummaryContentProps): ReactNode {
  const linkClass = buttonClass('secondary', 'md')
  return (
    <>
      <div className="flex flex-col gap-4">
        <h2 className="sr-only">{DASHBOARD_COPY.salesHeading}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title={DASHBOARD_COPY.salesToday}
            value={formatPesos(pesos(summary.salesTodayArs))}
          />
          <StatCard
            title={DASHBOARD_COPY.salesLast7Days}
            value={formatPesos(pesos(summary.salesLast7DaysArs))}
          />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="sr-only">{DASHBOARD_COPY.pendingHeading}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard
            title={DASHBOARD_COPY.ordersToShip}
            value={String(summary.ordersToShip)}
            hint={DASHBOARD_COPY.ordersToShipHint}
            action={
              <Link to="/pedidos" search={ORDERS_TO_SHIP_SEARCH} className={linkClass}>
                {DASHBOARD_COPY.viewOrders}
              </Link>
            }
          />
          <StatCard
            title={DASHBOARD_COPY.pendingReviews}
            value={String(summary.pendingReviews)}
            action={
              <Link to="/resenas" search={PENDING_REVIEWS_SEARCH} className={linkClass}>
                {DASHBOARD_COPY.moderate}
              </Link>
            }
          />
          <StatCard
            title={DASHBOARD_COPY.unreadMessages}
            value={String(summary.unreadMessages)}
            action={
              <Link to="/mensajes" search={UNREAD_MESSAGES_SEARCH} className={linkClass}>
                {DASHBOARD_COPY.read}
              </Link>
            }
          />
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PaymentAlertsSection alerts={summary.paymentAlerts} />
        <LowStockSection items={summary.lowStock} threshold={lowStockThreshold} />
      </div>
    </>
  )
}

/**
 * Pantalla "Resumen" (`/`): la fecha de hoy, la nota del modo de prueba, las ventas de hoy y de
 * los últimos 7 días, lo que hay para despachar, moderar y leer (con sus enlaces), las alertas de
 * pago y los productos con poco stock (el umbral sale de los ajustes). Mientras carga muestra la
 * forma de las tarjetas y, si falla, "No pudimos cargar el resumen." con "Reintentar". Sin
 * `today`, la fecha se actualiza cada minuto y al volver a la pestaña.
 *
 * @param props - Ver {@link DashboardScreenProps}.
 */
export function DashboardScreen({ isMockMode, today }: DashboardScreenProps): ReactNode {
  const api = useApiClient()
  const todayLabel = useTodayLabel(today)
  const summary = useQuery(adminDashboardQuery(api))
  const settings = useQuery(adminSettingsQuery(api))

  let content: ReactNode
  if (summary.isError || settings.isError) {
    content = (
      <ErrorState
        title={DASHBOARD_COPY.loadError}
        onRetry={() => {
          void summary.refetch()
          void settings.refetch()
        }}
      />
    )
  } else if (summary.isPending || settings.isPending) {
    content = <DashboardSkeleton />
  } else {
    content = (
      <SummaryContent summary={summary.data} lowStockThreshold={settings.data.lowStockThreshold} />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={DASHBOARD_COPY.title} description={todayLabel} />
      {isMockMode && (
        <p className="bg-surface rounded-lg px-4 py-3 text-sm text-neutral-300 shadow-sm">
          {DASHBOARD_COPY.mockNote}
        </p>
      )}
      {content}
    </div>
  )
}
