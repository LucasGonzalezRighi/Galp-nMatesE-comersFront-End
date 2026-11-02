import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cx } from './cx'

/**
 * Tono de un {@link Badge}: `accent` (cobre) para lo en curso, `success` (verde yerba) para lo
 * que está bien, `neutral` para lo que espera, `danger` para errores y alertas y `outline` para
 * lo terminado sin éxito (cancelado, vencido, devuelto).
 */
export type BadgeTone = 'accent' | 'success' | 'neutral' | 'danger' | 'outline'

/** Props de {@link Badge}: las de `<span>` más el tono. */
export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  /** Color del tag. */
  tone: BadgeTone
}

/** Fondo y texto de cada tono, como `.tag-*` del diseño (solo tokens). */
const TONE_CLASSES: Record<BadgeTone, string> = {
  accent: 'bg-accent-800 text-accent-100',
  success: 'bg-accent-2-800 text-accent-2-100',
  neutral: 'bg-neutral-800 text-neutral-100',
  danger: 'bg-danger/15 text-danger',
  // Borde interior (sin sumar alto) en `divider`: lo terminado no compite con lo en curso.
  outline: 'text-neutral-300 inset-ring inset-ring-divider',
}

/**
 * Tag de estado (`.tag` del diseño): 11 px, radio de 6 px, por ejemplo "Pagado" o "Cancelado".
 *
 * @param props - Ver {@link BadgeProps}. `className` suma clases de disposición.
 * @throws {RangeError} Si `tone` no es un tono conocido.
 * @example
 * <Badge tone="success">Pagado</Badge>
 */
export function Badge({ tone, className, children, ...props }: BadgeProps): ReactNode {
  if (!Object.hasOwn(TONE_CLASSES, tone)) {
    throw new RangeError(
      `El tono de la etiqueta tiene que ser accent, success, neutral, danger u outline; se recibió "${tone}".`,
    )
  }
  return (
    <span
      {...props}
      className={cx(
        'rounded-tag inline-flex items-center px-2.5 py-[3px] text-[11px] leading-tight tracking-[0.02em] whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
