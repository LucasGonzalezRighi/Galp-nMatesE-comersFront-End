import { cx } from './cx'

/** Variante visual de un botón del dashboard. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'

/** Tamaño de un botón: `md` de 36 px de alto mínimo y `sm` de 32 px. */
export type ButtonSize = 'md' | 'sm'

/**
 * Base de todos los botones: 14 px, peso 500, radio `md`, foco visible con anillo `accent` y
 * deshabilitado al 45 % de opacidad. El color y el fondo los define cada variante.
 */
const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium leading-tight no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none'

/** Fondo, color y estados de cada variante (solo tokens de `@galpon/design-tokens`). */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-background hover:bg-accent-400',
  secondary: 'bg-surface text-foreground shadow-sm hover:bg-neutral-900',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/10',
  danger: 'bg-danger text-background hover:bg-danger-border',
  icon: 'bg-transparent text-foreground hover:bg-foreground/10',
}

/** Alto mínimo y relleno de cada tamaño (no aplican a la variante `icon`). */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-9 px-4 py-2',
  sm: 'min-h-8 px-3 py-1',
}

/** Medidas fijas del botón de ícono: 36 por 36 en los dos tamaños. */
const ICON_SIZE_CLASS = 'size-9 p-0'

/**
 * Arma las clases de Tailwind de un botón del dashboard.
 *
 * La variante `icon` es un cuadrado de 36 por 36 sin relleno y no cambia con `size`.
 *
 * @param variant - Variante visual: `primary`, `secondary`, `ghost`, `danger` o `icon`.
 * @param size - Tamaño: `md` (36 px de alto mínimo) o `sm` (32 px).
 * @returns Las clases separadas por un espacio.
 * @throws {RangeError} Si `variant` o `size` no son valores conocidos.
 * @example
 * buttonClass('primary', 'md') // "inline-flex … bg-accent-500 text-background …"
 */
export function buttonClass(variant: ButtonVariant, size: ButtonSize): string {
  if (!Object.hasOwn(VARIANT_CLASSES, variant)) {
    throw new RangeError(
      `La variante del botón tiene que ser primary, secondary, ghost, danger o icon; se recibió "${variant}".`,
    )
  }
  if (!Object.hasOwn(SIZE_CLASSES, size)) {
    throw new RangeError(`El tamaño del botón tiene que ser md o sm; se recibió "${size}".`)
  }
  return cx(
    BASE,
    VARIANT_CLASSES[variant],
    variant === 'icon' ? ICON_SIZE_CLASS : SIZE_CLASSES[size],
  )
}
