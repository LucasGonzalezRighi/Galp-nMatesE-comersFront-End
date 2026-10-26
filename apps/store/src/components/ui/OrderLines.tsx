import type { CSSProperties, ReactNode } from 'react'
import type { OrderLine } from '@galpon/api-client'
import { formatPesos, pesos } from '@galpon/domain'
import { cx } from './cx'
import { ORDER_LINES_COPY } from './order-lines.copy'

/** Props de {@link OrderLines}. */
export interface OrderLinesProps {
  /** Líneas del pedido, como las devuelve la API (nombres y precios del momento de la compra). */
  lines: readonly OrderLine[]
  /** Clases extra de la lista. */
  className?: string
}

/** Línea divisoria entre una línea y la siguiente. */
const DIVIDER_STYLE: CSSProperties = {
  borderTop: '1px solid var(--color-divider)',
}

/** Texto secundario de una línea: las tres piezas de un kit o las opciones elegidas. */
function lineDetail(line: OrderLine): string {
  if (line.kitItems !== null && line.kitItems.length > 0) {
    return line.kitItems.map((item) => item.name).join(ORDER_LINES_COPY.kitJoiner)
  }
  return line.detail
}

/**
 * Líneas de un pedido ya hecho (las comparten la cuenta del cliente y el resultado del checkout):
 * nombre, detalle (opciones o piezas del kit), cantidad por precio unitario, ahorro del kit y total
 * de la línea. Los importes son los que guardó el pedido: no se recalculan.
 *
 * @param props - Ver {@link OrderLinesProps}.
 * @throws {RangeError} Si un importe no es un entero de pesos mayor o igual a 0.
 * @example
 * <OrderLines lines={order.lines} />
 */
export function OrderLines({ lines, className }: OrderLinesProps): ReactNode {
  return (
    <ul className={cx('m-0 flex list-none flex-col p-0', className)}>
      {lines.map((line, index) => {
        const detail = lineDetail(line)
        return (
          <li
            key={`${line.type}-${line.name}-${String(index)}`}
            className="flex gap-4 py-[14px] first:pt-0"
            style={index === 0 ? undefined : DIVIDER_STYLE}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[14px] leading-[1.3]">{line.name}</span>
              {detail === '' ? null : (
                <span className="text-[12px] text-neutral-400">{detail}</span>
              )}
              {line.kitSavingsArs > 0 ? (
                <span className="text-accent-300 text-[12px]">
                  {ORDER_LINES_COPY.youSave} {formatPesos(pesos(line.kitSavingsArs))}
                </span>
              ) : null}
              <span className="text-[12px] text-neutral-500 tabular-nums">
                {`${String(line.quantity)} ${ORDER_LINES_COPY.times} ${formatPesos(pesos(line.unitPriceArs))}`}
              </span>
            </div>
            <span className="flex-none text-[14px] tabular-nums">
              {formatPesos(pesos(line.totalArs))}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
