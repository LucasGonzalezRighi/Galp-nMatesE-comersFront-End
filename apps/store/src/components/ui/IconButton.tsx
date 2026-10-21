import type { ComponentProps, ReactNode } from 'react'
import type { IconButtonSize, IconButtonVariant } from './button-styles'
import { iconButtonClassName } from './button-styles'
import { cx } from './cx'

export type { IconButtonSize, IconButtonVariant } from './button-styles'

/** Props de {@link IconButton}: las de `<button>` más las del diseño. */
export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'aria-label'> {
  /** Nombre accesible del botón. Obligatorio: el contenido es solo un ícono. */
  'aria-label': string
  /** Variante visual. Por defecto `plain`, sin borde ni color propio. */
  variant?: IconButtonVariant
  /** Tamaño: `md` de 36 por 36 px o `sm` de 30 por 30 px. Por defecto `md`. */
  size?: IconButtonSize
}

/**
 * Botón cuadrado con un ícono (`.btn-icon` del diseño: 36 por 36 px).
 *
 * @param props - Ver {@link IconButtonProps}. `type` es `button` por defecto.
 * @throws {RangeError} Si `aria-label` está vacío.
 * @example
 * <IconButton aria-label="Cerrar carrito"><X size={16} aria-hidden="true" /></IconButton>
 */
export function IconButton({
  variant = 'plain',
  size = 'md',
  type = 'button',
  className,
  children,
  ...props
}: IconButtonProps): ReactNode {
  if (props['aria-label'].trim() === '') {
    throw new RangeError('IconButton necesita un aria-label con el nombre de la acción.')
  }
  return (
    <button
      {...props}
      type={type}
      className={cx(iconButtonClassName({ variant, size }), className)}
    >
      {children}
    </button>
  )
}
