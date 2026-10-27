import type { ReactNode } from 'react'
import { cx } from './cx'

/** Props de {@link EmptyState}. */
export interface EmptyStateProps {
  /** Qué falta, por ejemplo "Todavía no hay pedidos." */
  title: string
  /** Explicación o siguiente paso, en `neutral-400`. */
  description?: ReactNode
  /** Acción para salir del vacío (por ejemplo "Nuevo producto" o "Limpiar filtros"). */
  action?: ReactNode
  /** Clases extra del contenedor, para la disposición. */
  className?: string
}

/**
 * Estado vacío de una tabla o una lista: título, descripción y una acción, centrados.
 *
 * @param props - Ver {@link EmptyStateProps}.
 * @throws {RangeError} Si `title` está vacío.
 * @example
 * <EmptyState title="Todavía no hay productos" action={<Button>Nuevo producto</Button>} />
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps): ReactNode {
  if (title.trim() === '') {
    throw new RangeError('El título del estado vacío no puede estar vacío.')
  }
  return (
    <div className={cx('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <p className="text-h5">{title}</p>
      {description !== undefined && (
        <div className="max-w-prose text-sm text-neutral-400">{description}</div>
      )}
      {action !== undefined && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>
      )}
    </div>
  )
}
