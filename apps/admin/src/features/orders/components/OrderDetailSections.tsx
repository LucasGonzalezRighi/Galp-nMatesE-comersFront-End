import type { ReactNode } from 'react'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import type { Order, OrderLine } from '@galpon/api-client'
import { formatDateTime, formatDiscountPesos, pesos } from '@galpon/domain'
import type { DescriptionItem } from '../../../components/ui/DescriptionList'
import { Badge } from '../../../components/ui/Badge'
import { DescriptionList } from '../../../components/ui/DescriptionList'
import { Section } from '../../../components/ui/Section'
import { buildMailto } from '../../../lib/mailto'
import {
  formatMoney,
  formatOrderAddress,
  mercadoPagoPaymentUrl,
  paymentMethodText,
  statusDetailText,
} from '../order-format'
import {
  installmentsText,
  lastFourText,
  lineOptionsText,
  ORDER_STATUS_BADGES,
  ORDERS_COPY,
  PAYMENT_STATUS_BADGES,
  quantityTimesPrice,
  SHIPPING_METHOD_TEXT,
  trackingText,
} from '../orders.copy'

/** Props de {@link OrderDetailSections}. */
export interface OrderDetailSectionsProps {
  /** El pedido, tal como lo devolvió la API. */
  order: Order
}

/** Clases de un enlace dentro del contenido. */
const LINK_CLASS = 'text-accent-400 underline-offset-2 hover:underline'

/** Sección "Cliente": nombre, email con `mailto:` (codificado, {@link buildMailto}) y teléfono (o "—"). */
function CustomerSection({ order }: OrderDetailSectionsProps): ReactNode {
  const { firstName, lastName, email, phone } = order.customer
  return (
    <Section title={ORDERS_COPY.sections.customer}>
      <DescriptionList
        items={[
          { term: ORDERS_COPY.customer.name, details: `${firstName} ${lastName}` },
          {
            term: ORDERS_COPY.customer.email,
            details: (
              <a href={buildMailto(email)} className={LINK_CLASS}>
                {email}
              </a>
            ),
          },
          {
            term: ORDERS_COPY.customer.phone,
            details: phone ?? ORDERS_COPY.noPhone,
          },
        ]}
      />
    </Section>
  )
}

/** Sección "Envío": método, dirección, costo, plazo y seguimiento si ya se despachó. */
function ShippingSection({ order }: OrderDetailSectionsProps): ReactNode {
  const { shipping, tracking } = order
  const items: DescriptionItem[] = [
    { term: ORDERS_COPY.shipping.method, details: SHIPPING_METHOD_TEXT[shipping.method] },
    {
      term: ORDERS_COPY.shipping.address,
      details:
        shipping.address === null ? (
          ORDERS_COPY.noAddress
        ) : (
          <span className="flex flex-col">
            {formatOrderAddress(shipping.address).map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        ),
    },
    {
      term: ORDERS_COPY.shipping.cost,
      details: (
        <span className="tabular-nums">
          {shipping.costArs === 0 ? ORDERS_COPY.free : formatMoney(shipping.costArs)}
        </span>
      ),
    },
    { term: ORDERS_COPY.shipping.eta, details: shipping.eta },
  ]
  if (tracking !== null) {
    items.push({
      term: ORDERS_COPY.shipping.tracking,
      details: <span className="font-mono">{trackingText(tracking.carrier, tracking.number)}</span>,
    })
  }
  return (
    <Section title={ORDERS_COPY.sections.shipping}>
      <DescriptionList items={items} />
    </Section>
  )
}

/** Props de {@link LineItem}. */
interface LineItemProps {
  /** La línea, copiada al momento de la compra. */
  line: OrderLine
}

/**
 * Una línea del pedido: nombre, detalle o piezas con el cuero, cantidad × precio y total.
 *
 * - Un producto suelto muestra su `detail` tal cual: es texto congelado al comprar, así un pedido
 *   anterior a los cueros por producto conserva la virola que eligió.
 * - Un kit o un combo muestra sus piezas y, si el mate lleva cuero, "Cuero {x}" (su `detail`
 *   repite las piezas).
 */
function LineItem({ line }: LineItemProps): ReactNode {
  const isProduct = line.type === 'product'
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium">{line.name}</p>
        {isProduct && line.detail !== '' && (
          <p className="text-sm text-neutral-400">{line.detail}</p>
        )}
        {!isProduct && line.options !== null && (
          <p className="text-sm text-neutral-400">{lineOptionsText(line.options.leather)}</p>
        )}
        {line.kitItems !== null && (
          <ul aria-label={ORDERS_COPY.kitPieces} className="text-sm text-neutral-400">
            {line.kitItems.map((piece) => (
              <li key={piece.slug}>{piece.name}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-neutral-400 tabular-nums">
          {quantityTimesPrice(line.quantity, formatMoney(line.unitPriceArs))}
        </p>
      </div>
      <p className="font-medium tabular-nums sm:text-right">{formatMoney(line.totalArs)}</p>
    </li>
  )
}

/** Sección "Productos": las líneas copiadas al momento de la compra. */
function LinesSection({ order }: OrderDetailSectionsProps): ReactNode {
  return (
    <Section title={ORDERS_COPY.sections.lines}>
      <ul className="divide-divider flex flex-col divide-y">
        {order.lines.map((line, index) => (
          // Las líneas no traen identificador y no se reordenan: alcanza con la posición.
          <LineItem key={index} line={line} />
        ))}
      </ul>
    </Section>
  )
}

/** Props de {@link TotalRow}. */
interface TotalRowProps {
  /** Qué suma la fila, por ejemplo "Subtotal". */
  term: string
  /** El monto, ya formateado. */
  value: string
  /** Con `true` (el total), término y monto van en `font-medium`. */
  strong?: boolean
}

/** Fila de los totales. */
function TotalRow({ term, value, strong = false }: TotalRowProps): ReactNode {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? 'font-medium' : 'text-neutral-400'}>{term}</dt>
      <dd className={strong ? 'font-medium tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  )
}

/** Sección "Totales": productos, ahorro por kit (si hay), subtotal, envío y total. */
function TotalsSection({ order }: OrderDetailSectionsProps): ReactNode {
  return (
    <Section title={ORDERS_COPY.sections.totals}>
      <dl className="flex flex-col gap-2 text-sm">
        <TotalRow term={ORDERS_COPY.totals.items} value={formatMoney(order.itemsGrossArs)} />
        {order.kitSavingsArs > 0 && (
          <TotalRow
            term={ORDERS_COPY.totals.kitSavings}
            value={formatDiscountPesos(pesos(order.kitSavingsArs))}
          />
        )}
        <TotalRow term={ORDERS_COPY.totals.subtotal} value={formatMoney(order.subtotalArs)} />
        <TotalRow
          term={ORDERS_COPY.totals.shipping}
          value={order.shippingArs === 0 ? ORDERS_COPY.free : formatMoney(order.shippingArs)}
        />
        <TotalRow term={ORDERS_COPY.totals.total} value={formatMoney(order.totalArs)} strong />
      </dl>
    </Section>
  )
}

/** Sección "Pago": estado, detalle traducido, medio, tarjeta, cuotas y el ID con su enlace. */
function PaymentSection({ order }: OrderDetailSectionsProps): ReactNode {
  const { payment, paymentStatus } = order
  const badge = PAYMENT_STATUS_BADGES[paymentStatus]
  const items: DescriptionItem[] = [
    { term: ORDERS_COPY.payment.status, details: <Badge tone={badge.tone}>{badge.label}</Badge> },
  ]
  if (payment.statusDetail !== null) {
    const detail = statusDetailText(payment.statusDetail)
    items.push({
      term: ORDERS_COPY.payment.detail,
      details: detail.isCode ? <span className="font-mono">{detail.text}</span> : detail.text,
    })
  }
  items.push({ term: ORDERS_COPY.payment.method, details: paymentMethodText(payment) })
  if (payment.lastFour !== null) {
    items.push({ term: ORDERS_COPY.payment.card, details: lastFourText(payment.lastFour) })
  }
  if (payment.installments !== null) {
    items.push({
      term: ORDERS_COPY.payment.installments,
      details: installmentsText(payment.installments),
    })
  }
  if (payment.mpPaymentId !== null) {
    items.push({
      term: ORDERS_COPY.payment.mpId,
      details: (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono">{payment.mpPaymentId}</span>
          <a
            href={mercadoPagoPaymentUrl(payment.mpPaymentId)}
            target="_blank"
            rel="noreferrer"
            className={`${LINK_CLASS} inline-flex items-center gap-1 text-sm`}
          >
            {ORDERS_COPY.viewInMercadoPago}
            <span className="sr-only">{` ${ORDERS_COPY.newTab}`}</span>
            <ArrowSquareOutIcon size={18} weight="regular" aria-hidden="true" />
          </a>
        </span>
      ),
    })
  }
  return (
    <Section title={ORDERS_COPY.sections.payment}>
      <DescriptionList items={items} />
      <p className="text-sm text-neutral-400">{ORDERS_COPY.refundsNote}</p>
    </Section>
  )
}

/** Sección "Historial": cada cambio de estado con su fecha y hora y la nota si hay. */
function HistorySection({ order }: OrderDetailSectionsProps): ReactNode {
  return (
    <Section title={ORDERS_COPY.sections.history}>
      <ol className="flex flex-col gap-3">
        {order.history.map((entry) => (
          <li key={`${entry.status}-${entry.at}`} className="flex flex-col gap-0.5">
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-medium">{ORDER_STATUS_BADGES[entry.status].label}</span>
              <span className="text-sm text-neutral-400 tabular-nums">
                {formatDateTime(entry.at)}
              </span>
            </p>
            {entry.note !== null && <p className="text-sm text-neutral-400">{entry.note}</p>}
          </li>
        ))}
      </ol>
    </Section>
  )
}

/**
 * Secciones del detalle de un pedido: "Cliente", "Envío", "Productos", "Totales", "Pago" e
 * "Historial", en dos columnas desde 1024 px donde entran.
 *
 * @param props - Ver {@link OrderDetailSectionsProps}.
 */
export function OrderDetailSections({ order }: OrderDetailSectionsProps): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <CustomerSection order={order} />
        <ShippingSection order={order} />
      </div>
      <LinesSection order={order} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TotalsSection order={order} />
        <PaymentSection order={order} />
      </div>
      <HistorySection order={order} />
    </div>
  )
}
