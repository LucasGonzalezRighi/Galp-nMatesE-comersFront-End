import type { ReactNode } from 'react'
import { useId } from 'react'
import { cx } from './cx'

/** Props de {@link Section}. */
export interface SectionProps {
  /** Título de la sección (`h2`); también le da nombre a la región. */
  title: string
  /** Texto debajo del título, en `neutral-400`. */
  description?: ReactNode
  /** Botones de la sección: a la derecha del título desde 640 px y debajo en celular. */
  actions?: ReactNode
  /** Clases extra de la tarjeta, para la disposición. */
  className?: string
  /** Contenido de la sección. */
  children: ReactNode
}

/**
 * Sección de una pantalla: tarjeta `surface` con `shadow-sm`, radio `lg` y relleno de 16 px
 * (24 px desde 1024 px), con título `h2` en `text-h4`. Es una región con el nombre del título.
 *
 * @param props - Ver {@link SectionProps}.
 * @throws {RangeError} Si `title` está vacío.
 * @example
 * <Section title="Fotos" description="La primera es la principal.">…</Section>
 */
export function Section({
  title,
  description,
  actions,
  className,
  children,
}: SectionProps): ReactNode {
  const headingId = useId()
  if (title.trim() === '') {
    throw new RangeError('El título de la sección no puede estar vacío.')
  }
  return (
    <section
      aria-labelledby={headingId}
      className={cx('bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="text-h4">
            {title}
          </h2>
          {description !== undefined && (
            <div className="text-sm text-neutral-400">{description}</div>
          )}
        </div>
        {actions !== undefined && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
        )}
      </div>
      {children}
    </section>
  )
}
