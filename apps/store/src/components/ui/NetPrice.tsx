import type { ComponentProps, ReactNode } from 'react'
import { formatPesos, pesos } from '@galpon/domain'
import { cx } from './cx'
import { UI_COPY } from './ui.copy'

/** Props de {@link NetPrice}: las de `<span>` más el monto. */
export interface NetPriceProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Precio sin impuestos nacionales (`netPriceArs`, lo calcula el back; un número que se valida), o `null` si no hay. */
  amount: number | null
}

/**
 * Leyenda "Precio sin impuestos nacionales: $X" que va bajo cada precio de venta a consumidor
 * final cuando el ajuste `priceDisplay.showNetPrice` está activo (Ley 27.743, spec 14.5).
 * Quien la usa decide si corresponde mostrarla; sin monto no dibuja nada.
 *
 * @param props - Ver {@link NetPriceProps}.
 * @throws {RangeError} Si `amount` no es un entero de pesos mayor o igual a 0.
 * @example
 * {settings.priceDisplay.showNetPrice ? <NetPrice amount={product.netPriceArs} /> : null}
 */
export function NetPrice({ amount, className, ...props }: NetPriceProps): ReactNode {
  if (amount === null) return null
  return (
    <span {...props} className={cx('block text-[12px] text-neutral-400 tabular-nums', className)}>
      {UI_COPY.netPrice} {formatPesos(pesos(amount))}
    </span>
  )
}
