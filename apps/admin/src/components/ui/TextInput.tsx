import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'
import { cx } from './cx'
import { INPUT_CLASS } from './input-class'

/** Props de {@link TextInput}: las de `<input>`. */
export type TextInputProps = ComponentPropsWithoutRef<'input'>

/**
 * Campo de texto de una línea con las medidas de `.input` (alto mínimo de 36 px).
 *
 * Entrega el ref al `<input>`, así funciona con `register` de React Hook Form. Va dentro de un
 * `Field`, que le pasa el `id` y los atributos de accesibilidad.
 *
 * @param props - Ver {@link TextInputProps}. `type` es `text` por defecto; `className` suma
 *   clases de disposición.
 * @example
 * <Field label="Nombre">{(control) => <TextInput {...control} {...register('name')} />}</Field>
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { type = 'text', className, ...props },
  ref,
) {
  return <input {...props} ref={ref} type={type} className={cx(INPUT_CLASS, className)} />
})
