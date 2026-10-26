'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { ProductGroup } from '@galpon/domain'
import { Reveal } from '@/components/motion'
import { Price } from '@/components/ui'
import type { KitSlotView } from './kit-view'
import { KIT_COPY } from './kit.copy'

/** Props de {@link KitReview}. */
export interface KitReviewProps {
  /** Las tres piezas, en el orden del kit. */
  slots: readonly KitSlotView[]
  /** Se llama al tocar una pieza: lleva al paso de su grupo para cambiarla. */
  onSelect: (group: ProductGroup) => void
}

/** Línea divisora que se desvanece en los extremos, bajo cada renglón (la del diseño). */
const ROW_DIVIDER: CSSProperties = {
  background:
    'linear-gradient(to right, transparent, var(--color-neutral-800) 48px, var(--color-neutral-800) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px',
}

/** Retraso entre un renglón y el siguiente al aparecer, en milisegundos. */
const ROW_STAGGER_MS = 100

/**
 * Vista Resumen del kit: "Tu kit", la ayuda y una fila por pieza con su nombre y su precio.
 * Tocar una fila lleva al paso de esa pieza.
 *
 * @param props - Ver {@link KitReviewProps}.
 */
export function KitReview({ slots, onSelect }: KitReviewProps): ReactNode {
  return (
    <div>
      <div className="mb-5 flex flex-col gap-[6px]">
        <h2 className="text-[28px] leading-[1.12] font-medium tracking-[-0.02em]">
          {KIT_COPY.reviewTitle}
        </h2>
        <p className="text-[14px] text-neutral-400">{KIT_COPY.reviewHint}</p>
      </div>
      <div role="group" aria-label={KIT_COPY.reviewTitle} className="flex flex-col">
        {slots.map((slot, index) => (
          <Reveal key={slot.group} kind="left" delay={index * ROW_STAGGER_MS}>
            <button
              type="button"
              onClick={() => {
                onSelect(slot.group)
              }}
              style={ROW_DIVIDER}
              className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 px-1 py-[18px] text-left text-inherit"
            >
              <span className="flex flex-col gap-[3px]">
                <span className="text-accent text-[11px] tracking-[0.12em] uppercase">
                  {slot.label}
                </span>
                <span className="text-[18px]">{slot.product?.name ?? KIT_COPY.unchosen}</span>
              </span>
              {slot.product === null ? (
                <span className="text-[16px]">{KIT_COPY.noPrice}</span>
              ) : (
                <Price amount={slot.product.priceArs} size="sm" className="text-[16px]!" />
              )}
            </button>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
