import type { ReactNode } from 'react'
import type { Order } from '@galpon/api-client'
import { OrderLines } from '@/components/ui'
import { formatDiscountPesos, formatPesos, pesos } from '@galpon/domain'
import { RESULT_COPY } from './result.copy'

const COPY = RESULT_COPY.summary

/** Props de {@link OrderSummary}. */
export interface OrderSummaryProps {
  /** El pedido, como lo devuelve `GET /orders/{number}`. */
  order: Order
}

/** Props de {@link SummaryRow}. */
interface SummaryRowProps {
  /** Concepto. */
  label: string
  /** Valor ya formateado. */
  value: string
  /** Si es el total, que va más grande. */
  strong?: boolean
}

/** Una fila del resumen. */
function SummaryRow({ label, value, strong = false }: SummaryRowProps): ReactNode {
  return (
    <div
      className={
        strong
          ? 'flex items-baseline justify-between gap-3 pt-2 text-[20px]'
          : 'flex justify-between gap-3 text-[14px] text-neutral-400'
      }
    >
      <dt>{label}</dt>
      <dd className="m-0 text-right tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * Detalle de un pedido ya hecho, para el resultado del pago y el seguimiento del invitado: las
 * líneas con `OrderLines`, el envío con su plazo, el medio de pago y los importes que guardó el
 * pedido (no se recalculan).
 *
 * @param props - Ver {@link OrderSummaryProps}.
 */
export function OrderSummary({ order }: OrderSummaryProps): ReactNode {
  const { payment, shipping } = order
  const paymentText = [
    RESULT_COPY.paymentMethod[payment.method],
    payment.installments === null ? null : COPY.installments(payment.installments),
    payment.lastFour === null ? null : COPY.card(payment.lastFour),
  ]
    .filter((part) => part !== null)
    .join(' · ')
  return (
    <section
      aria-label={COPY.title}
      className="bg-surface flex w-full flex-col gap-4 rounded-[14px] p-5 shadow-sm"
    >
      <OrderLines lines={order.lines} />
      <dl
        className="m-0 flex flex-col gap-2 pt-4"
        style={{ borderTop: '1px solid var(--color-divider)' }}
      >
        {order.kitSavingsArs > 0 ? (
          <SummaryRow
            label={COPY.kitSavings}
            value={formatDiscountPesos(pesos(order.kitSavingsArs))}
          />
        ) : null}
        <SummaryRow label={COPY.subtotal} value={formatPesos(pesos(order.subtotalArs))} />
        <SummaryRow
          label={`${RESULT_COPY.shippingMethod[shipping.method]} · ${shipping.eta}`}
          value={order.shippingArs === 0 ? COPY.free : formatPesos(pesos(order.shippingArs))}
        />
        <SummaryRow label={COPY.payment} value={paymentText} />
        <SummaryRow label={COPY.total} value={formatPesos(pesos(order.totalArs))} strong />
      </dl>
    </section>
  )
}
