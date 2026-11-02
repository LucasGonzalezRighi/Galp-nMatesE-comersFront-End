import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'
import type { ButtonSize, ButtonVariant } from './button-class'
import { buttonClass } from './button-class'
import { cx } from './cx'
import { Spinner } from './Spinner'

/** Props de {@link Button}: las de `<button>` más las del diseño. */
export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Variante visual. Por defecto `primary`. */
  variant?: ButtonVariant
  /** Tamaño: `md` (36 px de alto mínimo) o `sm` (32 px). Por defecto `md`. */
  size?: ButtonSize
  /**
   * Muestra un indicador, deshabilita el botón y lo marca como ocupado (`aria-busy`). El texto
   * lo cambia quien lo usa a un gerundio ("Guardando…").
   */
  isLoading?: boolean
}

/**
 * Botón del dashboard.
 *
 * @param props - Ver {@link ButtonProps}. `type` es `button` por defecto, para que dentro de un
 *   formulario no envíe sin querer. Los botones de ícono (`variant="icon"`) necesitan `aria-label`.
 * @throws {RangeError} Si `variant` o `size` no son valores conocidos.
 * @example
 * <Button variant="primary" isLoading={isSaving}>{isSaving ? 'Guardando…' : 'Guardar'}</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    type = 'button',
    className,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled === true || isLoading}
      aria-busy={isLoading ? true : undefined}
      className={cx(buttonClass(variant, size), className)}
    >
      {isLoading && <Spinner />}
      {children}
    </button>
  )
})
