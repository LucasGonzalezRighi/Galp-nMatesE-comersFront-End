'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { CartView } from '@/features/cart'
import { NetPrice } from '@/components/ui'
import { formatDiscountPesos, formatPesos, pesos } from '@galpon/domain'
import { CHECKOUT_COPY } from './checkout.copy'

/** Línea divisora que se desvanece en los extremos (la del diseño). */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/** Separador inferior de cada línea del resumen. */
const LINE_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px',
}

/** Props de {@link CheckoutSummary}. */
export interface CheckoutSummaryProps {
  /** El carrito con los importes de la cotización (`useCartView`). */
  view: CartView
  /** Si todavía no llegó la primera cotización: se muestra el esqueleto. */
  loading: boolean
  /** Si falló la cotización. */
  error: boolean
  /** Costo del envío elegido, o `null` antes de elegirlo (paso 1). */
  shippingArs: number | null
  /** Total: el subtotal de la cotización más el envío. */
  totalArs: number
}

/** Props de {@link Bone}. */
interface BoneProps {
  /** Medidas del bloque. */
  className: string
}

/** Bloque gris que late mientras se cotiza. */
function Bone({ className }: BoneProps): ReactNode {
  return (
    <span className={`block rounded-md bg-neutral-800 motion-safe:animate-pulse ${className}`} />
  )
}

/** Texto del envío: pendiente, "Gratis" o el costo. */
function shippingText(shippingArs: number | null): string {
  if (shippingArs === null) return CHECKOUT_COPY.shippingPending
  return shippingArs === 0 ? CHECKOUT_COPY.free : formatPesos(pesos(shippingArs))
}

/**
 * Resumen lateral "Tu pedido" (spec 14.1 y 14.5): líneas (nombre × cantidad, detalle, total y
 * precio sin impuestos nacionales), ahorro por kit, subtotal (con su neto), envío y total. Los
 * importes vienen de `POST /cart/quote`; el resumen no calcula nada.
 *
 * @param props - Ver {@link CheckoutSummaryProps}.
 */
export function CheckoutSummary({
  view,
  loading,
  error,
  shippingArs,
  totalArs,
}: CheckoutSummaryProps): ReactNode {
  const { totals } = view
  return (
    <aside
      aria-labelledby="checkout-summary-title"
      aria-busy={loading}
      className="bg-surface flex max-w-[420px] min-w-0 flex-[1_1_300px] flex-col gap-3 self-start rounded-[14px] p-[22px] shadow-sm lg:sticky lg:top-[88px]"
    >
      <h2
        id="checkout-summary-title"
        className="text-[17px] leading-[1.55] font-normal tracking-normal"
      >
        {CHECKOUT_COPY.summaryTitle}
      </h2>
      {view.lines.map((line) => (
        <div
          key={line.key}
          className="flex justify-between gap-3 pt-2 pb-2 text-[13.5px]"
          style={LINE_STYLE}
        >
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span>
              {line.name} <span className="text-neutral-500">× {line.quantity}</span>
            </span>
            {line.detail === '' ? null : (
              <span className="text-[12px] text-neutral-500">{line.detail}</span>
            )}
            <NetPrice amount={line.netUnitPriceArs} className="text-[11.5px]" />
          </span>
          <span className="flex-none tabular-nums">
            {line.status === 'loading' ? (
              <Bone className="h-4 w-16" />
            ) : line.totalArs === null ? (
              <span className="text-danger">{CHECKOUT_COPY.soldOut}</span>
            ) : (
              formatPesos(pesos(line.totalArs))
            )}
          </span>
        </div>
      ))}
      {totals.kitSavingsArs > 0 ? (
        <div className="text-accent-300 flex justify-between text-[13.5px]">
          <span>{CHECKOUT_COPY.kitSavings}</span>
          <span className="tabular-nums">{formatDiscountPesos(pesos(totals.kitSavingsArs))}</span>
        </div>
      ) : null}
      <div className="flex justify-between gap-3 text-[13.5px]">
        <span className="text-neutral-400">{CHECKOUT_COPY.subtotal}</span>
        <span className="flex flex-col items-end tabular-nums">
          {loading ? <Bone className="h-4 w-20" /> : formatPesos(pesos(totals.subtotalArs))}
          <NetPrice amount={totals.netSubtotalArs} className="text-[11.5px]" />
        </span>
      </div>
      <div className="flex justify-between gap-3 text-[13.5px]">
        <span className="text-neutral-400">{CHECKOUT_COPY.shipping}</span>
        <span className="text-right tabular-nums">{shippingText(shippingArs)}</span>
      </div>
      <div aria-hidden="true" className="h-px" style={DIVIDER_STYLE} />
      <div className="flex items-baseline justify-between text-[22px]">
        <span>{CHECKOUT_COPY.total}</span>
        <span className="tabular-nums">
          {loading ? <Bone className="h-6 w-28" /> : formatPesos(pesos(totalArs))}
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-danger m-0 text-[12.5px]">
          {CHECKOUT_COPY.quoteError}
        </p>
      ) : null}
    </aside>
  )
}
