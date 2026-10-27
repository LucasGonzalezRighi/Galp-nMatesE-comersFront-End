import type { ReactNode } from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from './Button'
import { cx } from './cx'
import { UI_COPY } from './ui.copy'

/** Props de {@link ErrorState}. */
export interface ErrorStateProps {
  /** El mensaje de la feature, por ejemplo "No pudimos cargar los pedidos." */
  title: string
  /** Detalle o qué probar, en `neutral-400`. */
  description?: ReactNode
  /** Vuelve a pedir los datos (por ejemplo `refetch` de la consulta). */
  onRetry: () => void
  /** Clases extra del contenedor, para la disposición. */
  className?: string
}

/**
 * Estado de error de una pantalla, tabla o sección: se anuncia como alerta (`role="alert"`) y
 * ofrece "Reintentar".
 *
 * @param props - Ver {@link ErrorStateProps}.
 * @throws {RangeError} Si `title` está vacío.
 * @example
 * <ErrorState title="No pudimos cargar los pedidos." onRetry={() => void query.refetch()} />
 */
export function ErrorState({ title, description, onRetry, className }: ErrorStateProps): ReactNode {
  if (title.trim() === '') {
    throw new RangeError('El título del estado de error no puede estar vacío.')
  }
  return (
    <div
      role="alert"
      className={cx('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}
    >
      <WarningCircleIcon size={18} weight="regular" aria-hidden="true" className="text-danger" />
      <p className="text-h5">{title}</p>
      {description !== undefined && (
        <div className="max-w-prose text-sm text-neutral-400">{description}</div>
      )}
      <Button variant="secondary" onClick={onRetry} className="mt-1">
        {UI_COPY.retry}
      </Button>
    </div>
  )
}
