import type { ReactNode } from 'react'
import { useId } from 'react'

/** Props de {@link StatCard}. */
export interface StatCardProps {
  /** Título de la tarjeta (`h3`); es el nombre de la región. */
  title: string
  /** La cifra, ya formateada. */
  value: string
  /** Aclaración debajo de la cifra. */
  hint?: string
  /** Enlace a la pantalla que corresponde. */
  action?: ReactNode
}

/**
 * Tarjeta de una cifra del resumen: título, la cifra grande (`text-h3`, `tabular-nums`), una
 * aclaración y un enlace.
 *
 * @param props - Ver {@link StatCardProps}.
 * @throws {RangeError} Si `title` está vacío.
 */
export function StatCard({ title, value, hint, action }: StatCardProps): ReactNode {
  const headingId = useId()
  if (title.trim() === '') {
    throw new RangeError('El título de la tarjeta no puede estar vacío.')
  }
  return (
    <section
      aria-labelledby={headingId}
      className="bg-surface flex flex-col gap-2 rounded-lg p-4 shadow-sm lg:p-6"
    >
      <h3 id={headingId} className="text-h5 text-neutral-300">
        {title}
      </h3>
      <p className="text-h3 tabular-nums">{value}</p>
      {hint !== undefined && <p className="text-sm text-neutral-400">{hint}</p>}
      {action !== undefined && <div className="mt-auto pt-2">{action}</div>}
    </section>
  )
}
