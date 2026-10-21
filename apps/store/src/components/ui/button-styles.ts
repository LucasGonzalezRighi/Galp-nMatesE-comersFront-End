import { cx } from './cx'

/** Variante visual de un botón. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

/** Variantes que acepta el botón de ícono: las de {@link ButtonVariant} y la base, sin borde ni color propio. */
export type IconButtonVariant = ButtonVariant | 'plain'

/** Tamaño de un botón con texto: `sm` compacto, `md` el del diseño base y `lg` el de las llamadas a la acción. */
export type ButtonSize = 'sm' | 'md' | 'lg'

/** Tamaño de un botón de ícono: `md` de 36 px y `sm` de 30 px (dentro del selector de cantidad). */
export type IconButtonSize = 'sm' | 'md'

/**
 * Base de todos los botones (`.btn` del diseño): 14 px, peso 500, radio `md`, borde de 1 px y
 * fondo transparente. El color del borde y del texto los define cada variante: si estuvieran
 * también acá, Tailwind decidiría el ganador por el orden de su hoja y no por la variante.
 */
const BASE =
  'inline-flex cursor-pointer items-center justify-center rounded-md border bg-transparent font-medium leading-[1.2] no-underline disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45'

/** Color, borde y estados de cada variante. */
const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  primary: 'border-accent text-accent hover:bg-accent/12 active:bg-accent/22',
  secondary: 'border-divider text-foreground hover:bg-foreground/7 active:bg-foreground/14',
  ghost: 'border-transparent text-accent hover:bg-accent/10 active:bg-accent/18',
  plain: 'border-transparent text-foreground',
}

/** Alto, letra y separación de cada tamaño. */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'gap-[6px] py-(--space-1) text-[13px]',
  md: 'gap-[6px] py-(--space-2) text-[14px]',
  lg: 'min-h-[48px] gap-[10px] text-[15px]',
}

/** Relleno horizontal de cada tamaño; el fantasma usa el mínimo del diseño en todos. */
const PADDING_X_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-(--space-3)',
  md: 'px-[calc(var(--space-3)*1.2)]',
  lg: 'px-[22px]',
}

/** Lado de cada botón de ícono. */
const ICON_SIZE_CLASSES: Record<IconButtonSize, string> = {
  md: 'size-[36px]',
  sm: 'size-[30px]',
}

/** Opciones de {@link buttonClassName}. */
export interface ButtonClassNameOptions {
  /** Variante visual. */
  variant: ButtonVariant
  /** Tamaño. */
  size: ButtonSize
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean
}

/**
 * Arma las clases de un botón con texto.
 *
 * @param options - Ver {@link ButtonClassNameOptions}.
 * @returns Las clases de Tailwind de la variante y el tamaño pedidos.
 */
export function buttonClassName({
  variant,
  size,
  fullWidth = false,
}: ButtonClassNameOptions): string {
  return cx(
    BASE,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    variant === 'ghost' ? 'px-(--space-1)' : PADDING_X_CLASSES[size],
    fullWidth && 'w-full',
  )
}

/** Opciones de {@link iconButtonClassName}. */
export interface IconButtonClassNameOptions {
  /** Variante visual. */
  variant: IconButtonVariant
  /** Tamaño. */
  size: IconButtonSize
}

/**
 * Arma las clases de un botón de ícono (`.btn-icon` del diseño: 36 por 36, sin relleno).
 *
 * @param options - Ver {@link IconButtonClassNameOptions}.
 * @returns Las clases de Tailwind de la variante y el tamaño pedidos.
 */
export function iconButtonClassName({ variant, size }: IconButtonClassNameOptions): string {
  return cx(BASE, VARIANT_CLASSES[variant], ICON_SIZE_CLASSES[size], 'p-0 text-[14px]')
}
