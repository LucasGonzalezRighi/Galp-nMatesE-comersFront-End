import type { ComponentProps, ReactNode } from 'react'
import { CONTROL_CLASS_NAME, CONTROL_MIN_HEIGHT_CLASS_NAME } from './control-styles'
import { cx } from './cx'

/** Props de {@link Input}: las de `<input>`. */
export type InputProps = ComponentProps<'input'>

/**
 * Campo de texto de una línea (`.input` del diseño: alto mínimo de 36 px, fondo `surface`, borde
 * divisor y foco cobre).
 *
 * Para una etiqueta y un mensaje de error accesibles, usalo dentro de {@link Field}.
 *
 * @param props - Ver {@link InputProps}.
 * @example
 * <Field label="Correo">{(control) => <Input type="email" {...control} />}</Field>
 */
export function Input({ className, type = 'text', ...props }: InputProps): ReactNode {
  return (
    <input
      {...props}
      type={type}
      className={cx(CONTROL_CLASS_NAME, CONTROL_MIN_HEIGHT_CLASS_NAME, className)}
    />
  )
}
