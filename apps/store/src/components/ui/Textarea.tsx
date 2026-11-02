import type { ComponentProps, ReactNode } from 'react'
import { CONTROL_CLASS_NAME, TEXTAREA_SIZE_CLASS_NAME } from './control-styles'
import { cx } from './cx'

/** Props de {@link Textarea}: las de `<textarea>`. */
export type TextareaProps = ComponentProps<'textarea'>

/**
 * Campo de texto de varias líneas (`textarea.input` del diseño: mínimo 90 px de alto y estirable
 * en vertical).
 *
 * @param props - Ver {@link TextareaProps}.
 * @example
 * <Field label="Mensaje">{(control) => <Textarea rows={5} {...control} />}</Field>
 */
export function Textarea({ className, ...props }: TextareaProps): ReactNode {
  return (
    <textarea {...props} className={cx(CONTROL_CLASS_NAME, TEXTAREA_SIZE_CLASS_NAME, className)} />
  )
}
