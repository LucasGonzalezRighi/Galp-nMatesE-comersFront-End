import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Order } from '@galpon/api-client'
import { Button, OrderLines, Tag } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { formatDateTime, formatDiscountPesos, formatPesos, pesos } from '@galpon/domain'
import {
  ACCOUNT_COPY,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPPING_METHOD_LABELS,
} from './account.copy'
import { formatAddressLines } from './format-address'

/** Tarjeta de cada bloque del pedido. */
const CARD = 'bg-surface flex flex-col gap-3 rounded-lg p-[clamp(18px,2.4vw,26px)] shadow-sm'

/** Título de cada bloque. */
const CARD_TITLE = 'text-[12px] tracking-[0.12em] text-neutral-500 uppercase'

/** Props de {@link OrderDetail}. */
export interface OrderDetailProps {
  /** El pedido, con la sesión de su dueño (`GET /me/orders/{number}`). */
  order: Order
}

/** Props de {@link TotalRow}. */
interface TotalRowProps {
  /** Concepto. */
  label: string
  /** Importe ya formateado. */
  value: string
  /** Si es el total, que va más grande. */
  strong?: boolean
}

/** Una fila de los totales. */
function TotalRow({ label, value, strong = false }: TotalRowProps): ReactNode {
  return (
    <div
      className={
        strong
          ? 'flex justify-between gap-4 pt-3 text-[17px]'
          : 'flex justify-between gap-4 text-[14px] text-neutral-300'
      }
      style={strong ? { borderTop: '1px solid var(--color-divider)' } : undefined}
    >
      <dt>{label}</dt>
      <dd className="m-0 tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * Detalle de uno de los pedidos del cliente (`/cuenta/pedidos/[numero]`): número, fecha y estado;
 * el pago (estado, medio, cuotas y tarjeta), el envío (forma, dirección, plazo y seguimiento), las
 * líneas con `OrderLines`, los totales que guardó el pedido y el historial de estados. Las fechas
 * se muestran en hora de Buenos Aires.
 *
 * @param props - Ver {@link OrderDetailProps}.
 */
export function OrderDetail({ order }: OrderDetailProps): ReactNode {
  const { payment, shipping } = order
  const COPY = ACCOUNT_COPY.order
  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-3">
        <Link
          href={asRoute('/cuenta/pedidos')}
          className="text-accent text-[13px] underline-offset-4 hover:underline"
        >
          {COPY.back}
        </Link>
        <h1 className="text-[clamp(32px,4vw,52px)] leading-none tracking-[-0.03em] tabular-nums">
          {order.number}
        </h1>
        <p className="m-0 flex flex-wrap items-center gap-3 text-[14px] text-neutral-400">
          <span>
            {COPY.placedOn} {formatDateTime(order.createdAt)}
          </span>
          <Tag variant="outline">{ORDER_STATUS_LABELS[order.status]}</Tag>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className={CARD}>
          <h2 className={CARD_TITLE}>{COPY.payment}</h2>
          <p className="m-0 text-[15px]">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          <p className="m-0 text-[13px] text-neutral-400">
            {PAYMENT_METHOD_LABELS[payment.method]}
          </p>
          {payment.installments === null ? null : (
            <p className="m-0 text-[13px] text-neutral-400">
              {COPY.installments(payment.installments)}
            </p>
          )}
          {payment.lastFour === null ? null : (
            <p className="m-0 text-[13px] text-neutral-400">{COPY.card(payment.lastFour)}</p>
          )}
        </section>
        <section className={CARD}>
          <h2 className={CARD_TITLE}>{COPY.shipping}</h2>
          <p className="m-0 text-[15px]">{SHIPPING_METHOD_LABELS[shipping.method]}</p>
          {shipping.address === null ? (
            <p className="m-0 text-[13px] text-neutral-400">{COPY.pickup}</p>
          ) : (
            formatAddressLines(shipping.address).map((line) => (
              <p key={line} className="m-0 text-[13px] text-neutral-400">
                {line}
              </p>
            ))
          )}
          <p className="m-0 text-[13px] text-neutral-400">
            {COPY.eta}: {shipping.eta}
          </p>
          {order.tracking === null ? null : (
            <p className="m-0 text-[13px] text-neutral-300">
              {COPY.tracking}: {order.tracking.carrier} · {order.tracking.number}
            </p>
          )}
        </section>
      </div>

      <section className={CARD}>
        <h2 className={CARD_TITLE}>{COPY.lines}</h2>
        <OrderLines lines={order.lines} />
        <dl
          className="m-0 flex flex-col gap-2 pt-3"
          style={{ borderTop: '1px solid var(--color-divider)' }}
        >
          {order.kitSavingsArs > 0 ? (
            <>
              <TotalRow label={COPY.itemsGross} value={formatPesos(pesos(order.itemsGrossArs))} />
              <TotalRow
                label={COPY.kitSavings}
                value={formatDiscountPesos(pesos(order.kitSavingsArs))}
              />
            </>
          ) : null}
          <TotalRow label={COPY.subtotal} value={formatPesos(pesos(order.subtotalArs))} />
          <TotalRow
            label={COPY.shippingCost}
            value={order.shippingArs === 0 ? COPY.free : formatPesos(pesos(order.shippingArs))}
          />
          <TotalRow label={COPY.total} value={formatPesos(pesos(order.totalArs))} strong />
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={CARD_TITLE}>{COPY.history}</h2>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {order.history.map((entry) => (
            <li
              key={`${entry.at}-${entry.status}`}
              className="flex flex-wrap gap-x-3 text-[13px] text-neutral-400"
            >
              <span className="tabular-nums">{formatDateTime(entry.at)}</span>
              <span className="text-foreground">{ORDER_STATUS_LABELS[entry.status]}</span>
              {entry.note === null ? null : <span>{entry.note}</span>}
            </li>
          ))}
        </ol>
      </section>
    </article>
  )
}

/**
 * Página de un pedido que no se encontró (`/cuenta/pedidos/[numero]`): el número no existe, no
 * tiene el formato o es de otra cuenta. No dice cuál de los casos es (spec 9.7).
 */
export function OrderNotFound(): ReactNode {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-[clamp(32px,4vw,52px)] leading-none tracking-[-0.03em]">
        {ACCOUNT_COPY.order.notFoundTitle}
      </h1>
      <p className="m-0 text-[15px] text-neutral-300">{ACCOUNT_COPY.order.notFoundText}</p>
      <Button asChild variant="secondary">
        <Link href={asRoute('/cuenta/pedidos')}>{ACCOUNT_COPY.order.back}</Link>
      </Button>
    </section>
  )
}
