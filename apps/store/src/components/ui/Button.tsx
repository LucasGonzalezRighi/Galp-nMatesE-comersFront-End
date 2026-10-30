import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { Children, cloneElement, isValidElement } from 'react'
import type { ButtonSize, ButtonVariant } from './button-styles'
import { buttonClassName } from './button-styles'
import { ButtonFx } from './ButtonFx'
import { cx } from './cx'
import { Spinner } from './Spinner'

export type { ButtonSize, ButtonVariant } from './button-styles'

/**
 * Color con que se llena un botón al pasar el mouse (Ruling MR-16): `green` en casi todos y
 * `gray` en los del carrito y "Ver detalle".
 */
export type ButtonFill = 'green' | 'gray'

/**
 * Color de cada relleno (`--btn-fill`), elegido para que el texto blanco llegue a 4,5:1:
 * `accent-2-700` (#516324, 6,65:1; el `accent-2-500` da 2,81:1 y el `-600`, 4,21:1) y
 * `neutral-600` (#7a6a5c, 5,19:1).
 */
const FILL_CLASSES: Record<ButtonFill, string> = {
  green: '[--btn-fill:var(--color-accent-2-700)]',
  gray: '[--btn-fill:var(--color-neutral-600)]',
}

/**
 * Lo que el botón necesita para los efectos de {@link ButtonFx}: el grupo `btn` (la banda y la
 * flecha escuchan su hover y su foco), `isolate` para que la banda quede detrás del texto, la
 * transición del imán (300 ms, curva principal) y, con el mouse encima o el foco del teclado, el
 * borde y el brillo del color del relleno (`0 0 34px -12px` al 45 %) con el texto en blanco.
 */
const FX_HOST_CLASS =
  'group/btn relative isolate ease-main transition-[color,border-color,box-shadow,transform,scale] duration-300 not-disabled:active:scale-[0.98] not-disabled:hover:border-(--btn-fill) not-disabled:hover:text-[#fff] not-disabled:hover:shadow-[0_0_34px_-12px_color-mix(in_srgb,var(--btn-fill)_45%,transparent)] focus-visible:border-(--btn-fill) focus-visible:text-[#fff] focus-visible:shadow-[0_0_34px_-12px_color-mix(in_srgb,var(--btn-fill)_45%,transparent)]'

/** La flecha del final de un primario se corre 3 px a la derecha con el hover o el foco. */
const ARROW_SHIFT_CLASS =
  'ease-main transition-[translate] duration-300 motion-safe:group-hover/btn:translate-x-[3px] motion-safe:group-focus-visible/btn:translate-x-[3px]'

/**
 * Clases del botón para los efectos del portafolio (ver {@link ButtonFx}), con el color del
 * relleno. `Button` las pone solo; un botón de ícono que se llena (el "+" de agregar rápido) las
 * suma a mano junto con `<ButtonFx interactive={false} />`.
 *
 * @param fill - Color del relleno.
 * @returns Las clases de Tailwind.
 */
export function buttonFxClassName(fill: ButtonFill): string {
  return cx(FX_HOST_CLASS, FILL_CLASSES[fill])
}

/** Props de {@link Button}: las de `<button>` más las del diseño. */
export interface ButtonProps extends ComponentProps<'button'> {
  /** Variante visual: `primary` (cobre con borde), `secondary` (borde divisor) o `ghost` (solo texto). Por defecto `primary`. */
  variant?: ButtonVariant
  /** Tamaño: `sm`, `md` (el del diseño base) o `lg` (llamadas a la acción de 48 px). Por defecto `md`. */
  size?: ButtonSize
  /**
   * Color con que se llena al pasar el mouse: `green` (por defecto) o `gray` (los del carrito y
   * "Ver detalle", Ruling MR-16). Ver {@link ButtonFill}.
   */
  fill?: ButtonFill
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

/** Props que mira {@link withArrowShift} en el último hijo: un ícono decorativo. */
interface TrailingIconProps {
  className?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}

/** Frena el clic de un enlace que hace de botón no disponible: no navega ni llama a otros manejadores. */
function blockClick(event: MouseEvent<HTMLElement>): void {
  event.preventDefault()
}

/**
 * Si el contenido termina en un ícono decorativo (`aria-hidden`) después del texto, como la flecha
 * de "Ver la tienda", le suma el corrimiento de 3 px del hover. Un ícono adelante del texto no se
 * mueve.
 */
function withArrowShift(content: ReactNode): ReactNode {
  const parts = Children.toArray(content)
  const last = parts.at(-1)
  if (parts.length < 2 || !isValidElement<TrailingIconProps>(last)) return content
  const hidden = last.props['aria-hidden']
  if (hidden !== true && hidden !== 'true') return content
  return [
    ...parts.slice(0, -1),
    cloneElement(last, { className: cx(last.props.className, ARROW_SHIFT_CLASS) }),
  ]
}

/**
 * Botón de la tienda (`.btn` del diseño): 14 px, peso 500, deshabilitado al 45 %, con los efectos
 * de los botones del portafolio de Lucas (Ruling MR-14, ver {@link ButtonFx}): imán, barrido de
 * izquierda a derecha con el color de `fill` y el texto en blanco, brillo, onda al hacer clic y,
 * en los primarios, la flecha del final que se corre 3 px. Deshabilitado o cargando no lleva
 * efectos.
 *
 * @param props - Ver {@link ButtonProps}. `type` es `button` por defecto, para que dentro de un
 *   formulario no envíe sin querer.
 * @throws {RangeError} Si se usa `asChild` y los hijos no son un único elemento de React.
 * @example
 * <Button variant="primary" size="lg" loading={isPaying}>Pagar</Button>
 * @example
 * <Button asChild variant="secondary"><Link href="/tienda">Ver tienda</Link></Button>
 * @example
 * <Button fill="gray" onClick={add}>Agregar al carrito</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fill = 'green',
  loading = false,
  fullWidth = false,
  asChild = false,
  type = 'button',
  className,
  disabled,
  children,
  ...props
}: ButtonProps): ReactNode {
  const classes = cx(
    buttonClassName({ variant, size, fullWidth }),
    buttonFxClassName(fill),
    className,
  )
  const spinner = loading ? <Spinner size={size === 'lg' ? 18 : 16} /> : null
  const inactive = disabled === true || loading
  const fx = inactive ? null : <ButtonFx />
  const shift = (content: ReactNode): ReactNode =>
    variant === 'primary' ? withArrowShift(content) : content

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
      fx,
      spinner,
      shift(children.props.children),
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
      {fx}
      {spinner}
      {shift(children)}
    </button>
  )
}
