import type { ComponentProps, ReactNode } from 'react'
import { CONTROL_CLASS_NAME, CONTROL_MIN_HEIGHT_CLASS_NAME } from './control-styles'
import { cx } from './cx'

/** Props de {@link Select}: las de `<select>`. */
export type SelectProps = ComponentProps<'select'>

/**
 * Lista desplegable nativa con el aspecto de {@link Input}. Se usa el control del navegador para
 * conservar el teclado y la accesibilidad del sistema.
 *
 * @param props - Ver {@link SelectProps}; las opciones van como `children` (`<option>`).
 * @example
 * <Field label="Provincia">
 *   {(control) => <Select {...control}><option value="BA">Buenos Aires</option></Select>}
 * </Field>
 */
export function Select({ className, children, ...props }: SelectProps): ReactNode {
  return (
    <select {...props} className={cx(CONTROL_CLASS_NAME, CONTROL_MIN_HEIGHT_CLASS_NAME, className)}>
      {children}
    </select>
  )
}
