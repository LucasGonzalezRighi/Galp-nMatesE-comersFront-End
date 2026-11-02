import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { DashboardSummary } from '@galpon/api-client'
import { Badge } from '../../../components/ui/Badge'
import { buttonClass } from '../../../components/ui/button-class'
import { Section } from '../../../components/ui/Section'
import { DASHBOARD_COPY } from '../dashboard.copy'

/** Props de {@link LowStockSection}. */
export interface LowStockSectionProps {
  /** Productos publicados con poco stock, de menor a mayor stock. */
  items: DashboardSummary['lowStock']
  /** `lowStockThreshold` de los ajustes. */
  threshold: number
}

/**
 * "Poco stock": los productos publicados con `threshold` unidades o menos, cada uno con "Sin
 * stock" (badge `danger`) o "Quedan {n}" y "Editar"; sin ninguno, lo dice.
 *
 * @param props - Ver {@link LowStockSectionProps}.
 * @throws {RangeError} Si `threshold` no es un entero mayor o igual a 0.
 */
export function LowStockSection({ items, threshold }: LowStockSectionProps): ReactNode {
  return (
    <Section
      title={DASHBOARD_COPY.lowStock}
      description={DASHBOARD_COPY.lowStockDescription(threshold)}
    >
      {items.length === 0 ? (
        <p className="text-sm text-neutral-400">{DASHBOARD_COPY.noLowStock}</p>
      ) : (
        <ul className="divide-divider flex flex-col divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {item.stock === 0 ? (
                <Badge tone="danger">{DASHBOARD_COPY.outOfStock}</Badge>
              ) : (
                <span className="text-sm text-neutral-400 tabular-nums">
                  {DASHBOARD_COPY.unitsLeft(item.stock)}
                </span>
              )}
              <Link
                to="/productos/$id"
                params={{ id: item.id }}
                className={buttonClass('ghost', 'md')}
              >
                {`${DASHBOARD_COPY.edit} `}
                <span className="sr-only">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
