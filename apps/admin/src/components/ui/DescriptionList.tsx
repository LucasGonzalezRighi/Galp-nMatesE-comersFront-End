import type { ReactNode } from 'react'
import { cx } from './cx'

/** Un par término y detalle de {@link DescriptionList}. */
export interface DescriptionItem {
  /** Nombre del dato, por ejemplo "Cliente". No se repite en la lista. */
  term: string
  /** Valor del dato: texto, un enlace o varias líneas. */
  details: ReactNode
}

/** Props de {@link DescriptionList}. */
export interface DescriptionListProps {
  /** Los datos, en el orden en que se muestran. */
  items: readonly DescriptionItem[]
  /** Clases extra de la lista, para la disposición. */
  className?: string
}

/**
 * Lista de datos (`dl`): cada término con su detalle debajo, en una columna en celular y en dos
 * desde 640 px. El término va como un label (12 px al 70 %).
 *
 * @param props - Ver {@link DescriptionListProps}.
 * @throws {RangeError} Si dos datos tienen el mismo término.
 * @example
 * <DescriptionList items={[{ term: 'Cliente', details: 'Ana Pérez' }]} />
 */
export function DescriptionList({ items, className }: DescriptionListProps): ReactNode {
  if (new Set(items.map((item) => item.term)).size !== items.length) {
    throw new RangeError('Los términos de la lista de datos no pueden estar repetidos.')
  }
  return (
    <dl className={cx('grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.term} className="flex min-w-0 flex-col gap-1">
          <dt className="text-foreground/70 text-xs">{item.term}</dt>
          <dd className="break-words">{item.details}</dd>
        </div>
      ))}
    </dl>
  )
}
