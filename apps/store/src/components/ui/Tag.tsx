import type { ComponentProps, ReactNode } from 'react'
import { cx } from './cx'

/** Variante de color de una etiqueta. */
export type TagVariant = 'accent' | 'accent2' | 'neutral' | 'outline'

/** Props de {@link Tag}: las de `<span>` más la variante. */
export interface TagProps extends ComponentProps<'span'> {
  /** Color de la etiqueta. Por defecto `neutral`. */
  variant?: TagVariant
}

/** Fondo, texto y borde de cada variante (`.tag-*` del diseño). */
const VARIANT_CLASSES: Record<TagVariant, string> = {
  accent: 'bg-accent-800 text-accent-100',
  accent2: 'bg-accent-2-800 text-accent-2-100',
  neutral: 'bg-neutral-800 text-neutral-100',
  outline: 'border border-accent text-accent',
}

/**
 * Etiqueta corta (`.tag` del diseño: 11 px, radio 6 px), por ejemplo "Sin stock" o "Consultar".
 *
 * @param props - Ver {@link TagProps}.
 * @example
 * <Tag variant="outline">Consultar</Tag>
 */
export function Tag({ variant = 'neutral', className, children, ...props }: TagProps): ReactNode {
  return (
    <span
      {...props}
      className={cx(
        'rounded-tag inline-flex items-center px-[10px] py-[3px] text-[11px] tracking-[0.02em]',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
