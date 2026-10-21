import type { ComponentProps, ReactNode } from 'react'
import type { Pesos } from '@galpon/domain'
import { formatPesos, pesos } from '@galpon/domain'
import { cx } from './cx'
import { UI_COPY } from './ui.copy'

/** Tamaño del precio: `sm` 15 px (listados), `md` 18 px (tarjetas) o `lg` 38 px (ficha). */
export type PriceSize = 'sm' | 'md' | 'lg'

/** Props de {@link Price}: las de `<span>` más el monto y el tamaño. */
export interface PriceProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Monto en pesos, o `null` si el producto es "a consultar". */
  amount: Pesos | null
  /** Tamaño de la letra. Por defecto `md`. */
  size?: PriceSize
}

/** Letra de cada tamaño (valores del diseño); los números van con cifras tabulares. */
const SIZE_CLASSES: Record<PriceSize, string> = {
  sm: 'text-[15px]',
  md: 'text-[18px] font-medium',
  lg: 'text-[38px] tracking-[-0.025em]',
}

/**
 * Precio de venta con el formato del diseño ("$39.999"). Sin precio muestra "Consultar".
 *
 * @param props - Ver {@link PriceProps}.
 * @throws {RangeError} Si `amount` no es un entero de pesos mayor o igual a 0.
 * @example
 * <Price amount={product.priceArs} size="lg" />
 */
export function Price({ amount, size = 'md', className, ...props }: PriceProps): ReactNode {
  return (
    <span {...props} className={cx('tabular-nums', SIZE_CLASSES[size], className)}>
      {amount === null ? UI_COPY.consult : formatPesos(pesos(amount))}
    </span>
  )
}
