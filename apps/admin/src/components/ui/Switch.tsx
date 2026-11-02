import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { forwardRef, useId } from 'react'
import { cx } from './cx'

/** Props de {@link Switch}: las de `Switch.Root` de Radix más su texto. */
export interface SwitchProps extends ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  /** Texto del label, que también cambia el interruptor. */
  label: ReactNode
}

/**
 * Interruptor de Radix (`role="switch"`) con su label al lado: tocar el texto lo cambia.
 *
 * Es controlado con `checked` y `onCheckedChange` (por ejemplo desde un `Controller` de React
 * Hook Form, que recibe el ref del botón para darle el foco). Sin `id`, genera uno. `className`
 * suma clases al contenedor, para la disposición.
 *
 * @param props - Ver {@link SwitchProps}.
 * @example
 * <Switch label="Publicado" checked={field.value} onCheckedChange={field.onChange} ref={field.ref} />
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { label, id, className, ...props },
  ref,
) {
  const generatedId = useId()
  const switchId = id ?? generatedId
  return (
    <div className={cx('inline-flex min-h-9 items-center gap-3', className)}>
      <SwitchPrimitive.Root
        {...props}
        ref={ref}
        id={switchId}
        className="border-divider aria-invalid:border-danger-border data-[state=checked]:border-accent data-[state=checked]:bg-accent-500 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border bg-neutral-800 p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
      >
        <SwitchPrimitive.Thumb className="bg-foreground block size-4.5 rounded-full transition-transform data-[state=checked]:translate-x-4 motion-reduce:transition-none" />
      </SwitchPrimitive.Root>
      <label htmlFor={switchId} className="text-foreground cursor-pointer text-sm">
        {label}
      </label>
    </div>
  )
})
