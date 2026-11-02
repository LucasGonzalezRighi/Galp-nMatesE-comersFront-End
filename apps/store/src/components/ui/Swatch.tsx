import type { ComponentProps, ReactNode } from 'react'
import type { Leather } from '@galpon/domain'
import { tokens } from '@galpon/design-tokens'
import { isLeather } from '@galpon/domain'
import { cx } from './cx'

/** Props de {@link Swatch}: las de `<button>` más el cuero y si está elegido. */
export interface SwatchProps extends Omit<ComponentProps<'button'>, 'children' | 'color'> {
  /** Cuero que muestra; el color sale de los tokens de interfaz y el nombre es la etiqueta accesible. */
  leather: Leather
  /** Si es el cuero elegido: lleva un anillo de selección (y crece un poco en el tamaño `md`). */
  selected: boolean
  /**
   * `md` de 34 px (ficha del producto) o `sm` de 22 px (resumen del kit, sobre `surface`).
   * Por defecto `md`.
   */
  size?: 'sm' | 'md'
}

/** Anillo de cada tamaño y estado: el hueco de 2 px toma el color del fondo donde se apoya. */
const RING_CLASSES = {
  md: {
    selected:
      'scale-[1.08] shadow-[0_0_0_2px_var(--color-background),0_0_0_3px_var(--color-accent),0_0_18px_-2px_var(--color-accent)]',
    idle: 'shadow-[0_0_0_1px_var(--color-neutral-700)]',
  },
  sm: {
    selected: 'shadow-[0_0_0_2px_var(--color-surface),0_0_0_3px_var(--color-accent)]',
    idle: 'shadow-[0_0_0_1px_var(--color-neutral-700)]',
  },
} as const

/**
 * Círculo de color de un cuero con anillo de selección, para elegir el cuero de un mate. Es un
 * botón con `aria-pressed`: quien lo usa maneja la selección con `onClick`.
 *
 * @param props - Ver {@link SwatchProps}.
 * @throws {RangeError} Si `leather` no es uno de los cueros del dominio.
 * @example
 * <Swatch leather="Crudo" selected={leather === 'Crudo'} onClick={() => setLeather('Crudo')} />
 */
export function Swatch({
  leather,
  selected,
  size = 'md',
  type = 'button',
  className,
  ...props
}: SwatchProps): ReactNode {
  if (!isLeather(leather)) {
    throw new RangeError(`El cuero "${String(leather)}" no existe.`)
  }
  const ring = RING_CLASSES[size][selected ? 'selected' : 'idle']

  return (
    <button
      aria-label={leather}
      title={leather}
      {...props}
      type={type}
      aria-pressed={selected}
      style={{ backgroundColor: tokens.leathersUi[leather] }}
      className={cx(
        'ease-spring cursor-pointer rounded-full border-0 p-0 transition-[box-shadow,transform] duration-[350ms] motion-reduce:transition-none',
        size === 'md' ? 'size-[34px]' : 'size-[22px]',
        ring,
        className,
      )}
    />
  )
}
