'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import type { Leather } from '@galpon/domain'
import { Magnetic } from '@/components/motion'
import { Button, Swatch } from '@/components/ui'
import { formatDiscountPesos, formatPesos, resolveLeather } from '@galpon/domain'
import type { KitView } from './kit-view'
import { discountLabel, KIT_COPY } from './kit.copy'

/** Props de {@link KitSummary}. */
export interface KitSummaryProps {
  /** Lo que se muestra: piezas, importes y qué falta. */
  view: KitView
  /**
   * Cuero preferido: se muestra elegido si el mate lo ofrece; si no, el que da
   * `resolveLeather(leather, mate.leathers)`.
   */
  leather: Leather
  /** Descuento del kit, un entero entre 0 y 30. */
  discountPercent: number
  /** Se llama al elegir otro cuero. */
  onLeather: (leather: Leather) => void
  /** Se llama al tocar el botón de agregar (con al menos una pieza). */
  onAdd: (event: MouseEvent<HTMLButtonElement>) => void
  /** Se llama al tocar "Empezar de nuevo". */
  onReset: () => void
}

/** Fondo del panel: un resplandor de cobre oscuro arriba a la derecha sobre `surface`. */
const PANEL_STYLE: CSSProperties = {
  background:
    'radial-gradient(400px 220px at 100% 0%, color-mix(in srgb, var(--color-accent-800) 60%, transparent), transparent 70%), var(--color-surface)',
}

/** Id del aviso antes del botón, que el botón usa como descripción. */
const NOTICE_ID = 'kit-summary-notice'

/** Línea divisora que se desvanece en los extremos (la del diseño). */
const DIVIDER_STYLE: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent)',
}

/**
 * Panel "Resumen del kit": las tres piezas, el cuero del mate (una muestra por cada cuero que
 * ofrece el mate elegido; nada si no ofrece ninguno), subtotal, descuento (solo con las tres
 * piezas y si el kit tiene) y total, el aviso de `view.notice` antes del botón (que además lo
 * describe para el lector de pantalla) y los botones de agregar y "Empezar de nuevo". El de
 * agregar dice "Agregar kit al carrito" con las tres piezas, "Agregar al carrito" con una o dos
 * (van sueltas, a precio de lista) y está deshabilitado sin ninguna (Ruling AI-6). Los importes
 * vienen ya calculados en `view` con `kitLineAmounts`.
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
  const mate = view.slots.find((slot) => slot.group === 'mate')?.product ?? null
  const chosen = mate === null ? null : resolveLeather(leather, mate.leathers)
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
      {mate === null || chosen === null ? null : (
        <div className="flex items-center justify-between gap-3 text-[13.5px]">
          <span className="text-neutral-400">
            {KIT_COPY.leatherLabel} · {chosen}
          </span>
          <span role="group" aria-label={KIT_COPY.leatherLabel} className="flex gap-2">
            {mate.leathers.map((option) => (
              <Swatch
                key={option}
                leather={option}
                size="sm"
                selected={option === chosen}
                onClick={() => {
                  onLeather(option)
                }}
              />
            ))}
          </span>
        </div>
      )}
      <div aria-hidden="true" className="h-px" style={DIVIDER_STYLE} />
      <div className="flex justify-between text-[14px] tabular-nums">
        <span className="text-neutral-400">{KIT_COPY.subtotal}</span>
        <span>{formatPesos(view.amounts.grossArs)}</span>
      </div>
      {!view.isComplete || discountPercent === 0 ? null : (
        <div className="text-accent-300 flex justify-between text-[14px] tabular-nums">
          <span>{discountLabel(discountPercent)}</span>
          <span>{formatDiscountPesos(view.amounts.savingsArs)}</span>
        </div>
      )}
      <div className="flex items-baseline justify-between text-[22px] tabular-nums">
        <span>{KIT_COPY.total}</span>
        <span>{formatPesos(view.amounts.totalArs)}</span>
      </div>
      {view.notice === null ? null : (
        <p id={NOTICE_ID} className="text-[12.5px] text-neutral-500">
          {view.notice}
        </p>
      )}
      <Magnetic strength={0.15} reach={8} fullWidth>
        <Button
          size="lg"
          fill="gray"
          fullWidth
          disabled={!view.canAdd}
          aria-describedby={view.notice === null ? undefined : NOTICE_ID}
          onClick={onAdd}
          className="shadow-[0_0_30px_-10px_var(--color-accent)]"
        >
          {view.addLabel}
        </Button>
      </Magnetic>
      <Button variant="ghost" onClick={onReset} className="self-center">
        {KIT_COPY.startOver}
      </Button>
    </aside>
  )
}
