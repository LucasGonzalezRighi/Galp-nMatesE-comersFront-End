import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { cloneElement, isValidElement } from 'react'
import type { ButtonSize, ButtonVariant } from './button-styles'
import { buttonClassName } from './button-styles'
import { cx } from './cx'
import { Spinner } from './Spinner'

export type { ButtonSize, ButtonVariant } from './button-styles'

/** Props de {@link Button}: las de `<button>` más las del diseño. */
export interface ButtonProps extends ComponentProps<'button'> {
  /** Variante visual: `primary` (cobre con borde), `secondary` (borde divisor) o `ghost` (solo texto). Por defecto `primary`. */
  variant?: ButtonVariant
  /** Tamaño: `sm`, `md` (el del diseño base) o `lg` (llamadas a la acción de 48 px). Por defecto `md`. */
  size?: ButtonSize
  /** Muestra un indicador, deshabilita el botón y lo marca como ocupado (`aria-busy`). */
  loading?: boolean
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean
  /**
   * Aplica el estilo al único elemento hijo (por ejemplo un `<Link>`) en lugar de renderizar un
   * `<button>`. En un enlace, `disabled` y `loading` se expresan con `aria-disabled`, se lo saca del
   * orden de tabulación (`tabIndex` -1) y su clic no navega ni llama a otros manejadores.
   */
  asChild?: boolean
}

/** Props del hijo que recibe el estilo cuando se usa `asChild`. */
interface AsChildTarget {
  className?: string
  children?: ReactNode
}

/** Frena el clic de un enlace que hace de botón no disponible: no navega ni llama a otros manejadores. */
function blockClick(event: MouseEvent<HTMLElement>): void {
  event.preventDefault()
}

/**
 * Botón de la tienda (`.btn` del diseño): 14 px, peso 500, deshabilitado al 45 %.
 *
 * @param props - Ver {@link ButtonProps}. `type` es `button` por defecto, para que dentro de un
 *   formulario no envíe sin querer.
 * @throws {RangeError} Si se usa `asChild` y los hijos no son un único elemento de React.
 * @example
 * <Button variant="primary" size="lg" loading={isPaying}>Pagar</Button>
 * @example
 * <Button asChild variant="secondary"><Link href="/tienda">Ver tienda</Link></Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  asChild = false,
  type = 'button',
  className,
  disabled,
  children,
  ...props
}: ButtonProps): ReactNode {
  const classes = cx(buttonClassName({ variant, size, fullWidth }), className)
  const spinner = loading ? <Spinner size={size === 'lg' ? 18 : 16} /> : null
  const inactive = disabled === true || loading

  if (asChild) {
    if (!isValidElement<AsChildTarget>(children)) {
      throw new RangeError(
        'Button con asChild necesita un único elemento hijo, por ejemplo un enlace (<Link>).',
      )
    }
    return cloneElement(
      children,
      {
        ...props,
        className: cx(classes, children.props.className),
        // Un enlace no se deshabilita: se saca del orden de tabulación y se frena su clic.
        ...(inactive ? { 'aria-disabled': true, tabIndex: -1, onClick: blockClick } : null),
        ...(loading ? { 'aria-busy': true } : null),
      },
      spinner,
      children.props.children,
    )
  }

  return (
    <button
      {...props}
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading ? true : undefined}
      className={classes}
    >
      {spinner}
      {children}
    </button>
  )
}
