import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { forwardRef } from 'react'
import { cx } from './cx'

/** Props de {@link Checkbox}: las de `<input type="checkbox">` más su texto. */
export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  /** Texto del label, que también marca y desmarca la casilla. */
  label: ReactNode
}

/**
 * Casilla nativa con su label (14 px) envolviéndola: tocar el texto la marca.
 *
 * Entrega el ref al `<input>`, así funciona con `register` de React Hook Form. `className`
 * suma clases al label, para la disposición.
 *
 * @param props - Ver {@link CheckboxProps}.
 * @example
 * <Checkbox label="Destacado en el inicio" {...register('featured')} />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, ...props },
  ref,
) {
  return (
    <label
      className={cx(
        'text-foreground inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-45',
        className,
      )}
    >
      <input
        {...props}
        ref={ref}
        type="checkbox"
        className="accent-accent aria-invalid:outline-danger-border size-4 shrink-0 cursor-pointer disabled:cursor-not-allowed aria-invalid:outline-2"
      />
      <span>{label}</span>
    </label>
  )
})
