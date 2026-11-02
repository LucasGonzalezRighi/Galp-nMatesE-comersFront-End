import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { DashboardSummary } from '@galpon/api-client'
import { Badge } from '../../../components/ui/Badge'
import { Section } from '../../../components/ui/Section'
import { DASHBOARD_COPY } from '../dashboard.copy'

/** Props de {@link PaymentAlertsSection}. */
export interface PaymentAlertsSectionProps {
  /** Las alertas del resumen, en el orden en que vienen. */
  alerts: DashboardSummary['paymentAlerts']
}

/**
 * "Alertas de pago": cada una con su tipo (badge `danger`), la explicación y "Ver pedido
 * {número}"; sin alertas, "No hay alertas de pago.".
 *
 * @param props - Ver {@link PaymentAlertsSectionProps}.
 */
export function PaymentAlertsSection({ alerts }: PaymentAlertsSectionProps): ReactNode {
  return (
    <Section title={DASHBOARD_COPY.paymentAlerts}>
      {alerts.length === 0 ? (
        <p className="text-sm text-neutral-400">{DASHBOARD_COPY.noPaymentAlerts}</p>
      ) : (
        <ul className="divide-divider flex flex-col divide-y">
          {alerts.map((alert) => (
            <li
              key={`${alert.orderNumber}-${alert.kind}`}
              className="flex flex-col items-start gap-2 py-3 first:pt-0 last:pb-0"
            >
              <Badge tone="danger">{DASHBOARD_COPY.alertKinds[alert.kind]}</Badge>
              <p className="text-sm">{alert.message}</p>
              <Link
                to="/pedidos/$numero"
                params={{ numero: alert.orderNumber }}
                className="text-accent-400 hover:text-accent-300 text-sm underline"
              >
                {`${DASHBOARD_COPY.viewOrder} `}
                <span className="font-mono">{alert.orderNumber}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
