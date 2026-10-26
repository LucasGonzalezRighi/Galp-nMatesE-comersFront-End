'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import type { Leather } from '@galpon/domain'
import { Magnetic } from '@/components/motion'
import { Button, Swatch } from '@/components/ui'
import { formatDiscountPesos, formatPesos, LEATHERS } from '@galpon/domain'
import type { KitView } from './kit-view'
import { discountLabel, KIT_COPY, missingText } from './kit.copy'

/** Props de {@link KitSummary}. */
export interface KitSummaryProps {
  /** Lo que se muestra: piezas, importes y qué falta. */
  view: KitView
  /** Cuero elegido para el mate. */
  leather: Leather
  /** Descuento del kit, un entero entre 0 y 30. */
  discountPercent: number
  /** Se llama al elegir otro cuero. */
  onLeather: (leather: Leather) => void
  /** Se llama al tocar "Agregar kit al carrito" (solo con las tres piezas). */
  onAdd: (event: MouseEvent<HTMLButtonElement>) => void
  /** Se llama al tocar "Empezar de nuevo". */
  onReset: () => void
}

/** Fondo del panel: un resplandor de cobre oscuro arriba a la derecha sobre `surface`. */
const PANEL_STYLE: CSSProperties = {
  background:
    'radial-gradient(400px 220px at 100% 0%, color-mix(in srgb, var(--color-accent-800) 60%, transparent), transparent 70%), var(--color-surface)',
}

/** Línea divisora que se desvanece en los extremos (la del diseño). */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/**
 * Panel "Resumen del kit": las tres piezas, el cuero del mate (con sus muestras), subtotal,
 * descuento (si el kit tiene) y total, lo que falta elegir y los botones "Agregar kit al carrito" (deshabilitado
 * hasta tener las tres piezas) y "Empezar de nuevo". Los importes vienen ya calculados en `view`
 * con `kitLineAmounts`.
 *
 * @param props - Ver {@link KitSummaryProps}.
 */
export function KitSummary({
  view,
  leather,
  discountPercent,
  onLeather,
  onAdd,
  onReset,
}: KitSummaryProps): ReactNode {
  const hasMate = view.slots.some((slot) => slot.group === 'mate' && slot.product !== null)
  return (
    <aside
      aria-labelledby="kit-summary-title"
      className="sticky top-[88px] flex max-w-[420px] flex-[1_1_300px] flex-col gap-[14px] rounded-[14px] p-[22px] shadow-sm"
      style={PANEL_STYLE}
    >
      <h2 id="kit-summary-title" className="text-[17px] leading-[1.55] font-normal tracking-normal">
        {KIT_COPY.panelTitle}
      </h2>
      {view.slots.map((slot) => (
        <div key={slot.group} className="flex justify-between gap-3 text-[13.5px]">
          <span className="text-neutral-400">{slot.label}</span>
          <span className="max-w-[65%] text-right">{slot.product?.name ?? KIT_COPY.unchosen}</span>
        </div>
      ))}
      {hasMate ? (
        <div className="flex items-center justify-between gap-3 text-[13.5px]">
          <span className="text-neutral-400">
            {KIT_COPY.leatherLabel} · {leather}
          </span>
          <span role="group" aria-label={KIT_COPY.leatherLabel} className="flex gap-2">
            {LEATHERS.map((option) => (
              <Swatch
                key={option}
                leather={option}
                size="sm"
                selected={option === leather}
                onClick={() => {
                  onLeather(option)
                }}
              />
            ))}
          </span>
        </div>
      ) : null}
      <div aria-hidden="true" className="h-px" style={DIVIDER_STYLE} />
      <div className="flex justify-between text-[14px] tabular-nums">
        <span className="text-neutral-400">{KIT_COPY.subtotal}</span>
        <span>{formatPesos(view.amounts.grossArs)}</span>
      </div>
      {discountPercent === 0 ? null : (
        <div className="text-accent-300 flex justify-between text-[14px] tabular-nums">
          <span>{discountLabel(discountPercent)}</span>
          <span>{formatDiscountPesos(view.amounts.savingsArs)}</span>
        </div>
      )}
      <div className="flex items-baseline justify-between text-[22px] tabular-nums">
        <span>{KIT_COPY.total}</span>
        <span>{formatPesos(view.amounts.totalArs)}</span>
      </div>
      {view.isComplete ? null : (
        <p className="text-[12.5px] text-neutral-500">{missingText(view.missing)}</p>
      )}
      <Magnetic strength={0.15} reach={8} fullWidth>
        <Button
          size="lg"
          fullWidth
          disabled={!view.isComplete}
          onClick={onAdd}
          className="shadow-[0_0_30px_-10px_var(--color-accent)]"
        >
          {KIT_COPY.addKit}
        </Button>
      </Magnetic>
      <Button variant="ghost" onClick={onReset} className="self-center">
        {KIT_COPY.startOver}
      </Button>
    </aside>
  )
}
