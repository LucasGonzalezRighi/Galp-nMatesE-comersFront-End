import type { ComponentProps, ReactNode } from 'react'
import type { Pesos } from '@galpon/domain'
import { formatPercentAr, formatPesos, installmentAmount, pesos } from '@galpon/domain'
import { cx } from './cx'
import { INSTALLMENTS_COPY } from './ui.copy'

/** Ajuste de cuotas de la tienda (`PublicSettings.installments`). */
export interface InstallmentsSetting {
  /** Cantidad máxima de cuotas sin interés configuradas en Mercado Pago. */
  maxWithoutInterest: number
  /** Si se muestran las cuotas en la tarjeta y en la ficha del producto. */
  showOnProduct: boolean
}

/** Props de {@link InstallmentsNote}: las de `<p>` más el precio y el ajuste. */
export interface InstallmentsNoteProps extends Omit<ComponentProps<'p'>, 'children'> {
  /** Precio de venta, o `null` si el producto es "a consultar". */
  price: Pesos | null
  /** Ajuste de cuotas de la tienda. */
  installments: InstallmentsSetting
}

/** CFT y TEA de las cuotas sin interés: son cero por definición ("sin interés" solo si el CFT es 0). */
const WITHOUT_INTEREST_RATE = 0

/**
 * Leyenda de cuotas sin interés de la tarjeta y la ficha (spec 14.4):
 * "o 3 cuotas sin interés de $13.333 · CFT 0,00 % (TEA 0,00 %)", con el CFT destacado y la TEA en
 * letra menor. El monto es informativo (`round(precio / N)`); el real lo define Mercado Pago.
 *
 * No dibuja nada si `showOnProduct` es falso, si hay una sola cuota o menos, o si no hay precio.
 *
 * @param props - Ver {@link InstallmentsNoteProps}.
 * @throws {RangeError} Si el precio no es un entero de pesos o la cantidad de cuotas no es un entero.
 * @example
 * <InstallmentsNote price={product.priceArs} installments={settings.installments} />
 */
export function InstallmentsNote({
  price,
  installments,
  className,
  ...props
}: InstallmentsNoteProps): ReactNode {
  const { maxWithoutInterest, showOnProduct } = installments
  if (!showOnProduct || maxWithoutInterest <= 1 || price === null) return null

  const rate = formatPercentAr(WITHOUT_INTEREST_RATE)
  return (
    <p {...props} className={cx('text-[12px] text-neutral-300 tabular-nums', className)}>
      {INSTALLMENTS_COPY.prefix} {maxWithoutInterest} {INSTALLMENTS_COPY.withoutInterest}{' '}
      {formatPesos(installmentAmount(pesos(price), maxWithoutInterest))}{' '}
      {INSTALLMENTS_COPY.separator}{' '}
      <strong className="text-foreground text-[13px] font-medium">
        {INSTALLMENTS_COPY.cft} {rate}
      </strong>{' '}
      <span className="text-[11px] text-neutral-400">
        ({INSTALLMENTS_COPY.tea} {rate})
      </span>
    </p>
  )
}
