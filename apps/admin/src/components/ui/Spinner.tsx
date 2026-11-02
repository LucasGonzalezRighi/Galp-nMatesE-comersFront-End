import type { ReactNode } from 'react'
import { cx } from './cx'

/** Props de {@link Spinner}. */
export interface SpinnerProps {
  /** Lado en píxeles. Por defecto 16. */
  size?: number
  /**
   * Texto que anuncian los lectores de pantalla (por ejemplo "Cargando"). Sin texto, el
   * indicador es decorativo y se oculta a la tecnología asistiva: quien lo usa ya informa
   * el estado (por ejemplo con `aria-busy`).
   */
  label?: string
  /** Clases extra, por ejemplo para el color (`text-accent`). */
  className?: string
}

/**
 * Indicador de carga circular que hereda el color del texto (`currentColor`).
 *
 * Con `prefers-reduced-motion: reduce` no gira: el texto de quien lo usa ("Guardando…") ya
 * informa que la acción está en curso.
 *
 * @param props - Ver {@link SpinnerProps}.
 * @throws {RangeError} Si `size` no es un número mayor a 0.
 * @example
 * <Spinner label="Cargando" />
 */
export function Spinner({ size = 16, label, className }: SpinnerProps): ReactNode {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(
      `El tamaño del indicador tiene que ser mayor a 0; se recibió ${String(size)}.`,
    )
  }
  const circle = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cx('animate-spin motion-reduce:animate-none', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
  if (label === undefined) return circle
  return (
    <span role="status" className="inline-flex">
      {circle}
      <span className="sr-only">{label}</span>
    </span>
  )
}
