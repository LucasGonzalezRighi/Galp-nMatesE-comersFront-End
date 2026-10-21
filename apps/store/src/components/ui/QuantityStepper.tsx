'use client'

import type { ReactNode } from 'react'
import { assertValidQuantity } from '@galpon/domain'
import { cx } from './cx'
import { IconButton } from './IconButton'
import { UI_COPY } from './ui.copy'

/** Props de {@link QuantityStepper}. */
export interface QuantityStepperProps {
  /** Cantidad actual, un entero mayor o igual a 1. */
  value: number
  /**
   * Cantidad máxima que se puede elegir (por ejemplo `remainingQuantityFor(...)` del dominio), un
   * entero mayor o igual a 0. Con `value >= max` el "+" queda deshabilitado.
   */
  max: number
  /** Se llama con la nueva cantidad al sumar o restar. */
  onChange: (quantity: number) => void
  /**
   * Si existe, el "−" en 1 sigue activo y llama a esta función (quitar la línea del carrito) en
   * lugar de quedar deshabilitado.
   */
  onRemove?: () => void
  /** `md` (48 px de alto, ficha del producto) o `sm` (30 px, líneas del carrito). Por defecto `md`. */
  size?: 'sm' | 'md'
  /** Clases extra del contenedor. */
  className?: string
}

/** Cantidad mínima de una línea. */
const MIN_QUANTITY = 1

/** Signo menos tipográfico (U+2212) del diseño. */
const MINUS = '−'

/**
 * Selector de cantidad con "−" y "+" (mínimo 1, máximo por prop). Si la cantidad supera el máximo
 * (por ejemplo, bajó el stock), el "+" queda deshabilitado y el "−" la baja hasta el máximo.
 *
 * @param props - Ver {@link QuantityStepperProps}.
 * @throws {RangeError} Si `value` no es un entero mayor o igual a 1 o `max` no es un entero mayor o igual a 0.
 * @example
 * <QuantityStepper value={qty} max={maxQuantity(stock)} onChange={setQty} />
 */
export function QuantityStepper({
  value,
  max,
  onChange,
  onRemove,
  size = 'md',
  className,
}: QuantityStepperProps): ReactNode {
  assertValidQuantity(value)
  if (!Number.isInteger(max) || max < 0) {
    throw new RangeError(
      `El máximo tiene que ser un entero mayor o igual a 0; se recibió ${String(max)}.`,
    )
  }

  const isAtMinimum = value <= MIN_QUANTITY
  const removes = isAtMinimum && onRemove !== undefined
  const isCompact = size === 'sm'

  return (
    <div
      role="group"
      aria-label={UI_COPY.quantity}
      className={cx(
        'inline-flex items-center rounded-md shadow-[inset_0_0_0_1px_var(--color-divider)]',
        !isCompact && 'h-[48px]',
        className,
      )}
    >
      <IconButton
        aria-label={removes ? UI_COPY.remove : UI_COPY.decrease}
        size={isCompact ? 'sm' : 'md'}
        disabled={isAtMinimum && !removes}
        onClick={() => {
          if (removes) {
            onRemove()
            return
          }
          onChange(Math.max(MIN_QUANTITY, Math.min(value - 1, max)))
        }}
      >
        {MINUS}
      </IconButton>
      <span
        aria-live="polite"
        className={cx(
          'text-center tabular-nums',
          isCompact ? 'min-w-[22px] text-[13px]' : 'min-w-[30px]',
        )}
      >
        {value}
      </span>
      <IconButton
        aria-label={UI_COPY.increase}
        size={isCompact ? 'sm' : 'md'}
        disabled={value >= max}
        onClick={() => {
          onChange(value + 1)
        }}
      >
        +
      </IconButton>
    </div>
  )
}
