import type { ChangeEvent, ComponentPropsWithoutRef } from 'react'
import { forwardRef, useCallback, useState } from 'react'
import { cx } from './cx'
import { TEXTAREA_CLASS } from './input-class'
import { characterCountText } from './ui.copy'

/** Props de {@link Textarea}: las de `<textarea>`. */
export type TextareaProps = ComponentPropsWithoutRef<'textarea'>

/** Desde qué parte del máximo el contador se anuncia a los lectores de pantalla. */
const ANNOUNCE_FROM = 0.9

/** Largo de un valor de `<textarea>` (`value` o `defaultValue`), o 0 si no es texto. */
function lengthOf(value: TextareaProps['value']): number {
  return typeof value === 'string' ? value.length : 0
}

/**
 * Texto de varias líneas con las medidas de `.input` (alto mínimo de 90 px, alto ajustable).
 *
 * Con `maxLength` muestra el contador "{n} / {max}", que se anuncia (`aria-live="polite"`) solo
 * desde el 90 % del máximo. Cuenta el valor controlado (`value`) o, sin él, lo que hay en el
 * campo: también el valor que pone `register` de React Hook Form al montar o al descartar.
 *
 * @param props - Ver {@link TextareaProps}. Entrega el ref al `<textarea>`.
 * @throws {RangeError} Si `maxLength` no es un entero mayor a 0.
 * @example
 * <Field label="Descripción">
 *   {(control) => <Textarea {...control} maxLength={160} {...register('description')} />}
 * </Field>
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, maxLength, value, defaultValue, onChange, ...props },
  ref,
) {
  const [fieldLength, setFieldLength] = useState(() => lengthOf(defaultValue))
  // Ref combinado: entrega el elemento a quien lo pidió (por ejemplo `register`, que en ese
  // momento le pone el valor) y después cuenta lo que quedó escrito.
  const setRefs = useCallback(
    (element: HTMLTextAreaElement | null) => {
      if (typeof ref === 'function') ref(element)
      else if (ref !== null) ref.current = element
      if (element !== null) setFieldLength(element.value.length)
    },
    [ref],
  )
  if (maxLength !== undefined && (!Number.isSafeInteger(maxLength) || maxLength <= 0)) {
    throw new RangeError(
      `El máximo de caracteres tiene que ser un entero mayor a 0; se recibió ${String(maxLength)}.`,
    )
  }
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setFieldLength(event.target.value.length)
    onChange?.(event)
  }
  const length = value === undefined ? fieldLength : lengthOf(value)
  const textarea = (
    <textarea
      {...props}
      ref={setRefs}
      value={value}
      defaultValue={defaultValue}
      maxLength={maxLength}
      onChange={handleChange}
      className={cx(TEXTAREA_CLASS, className)}
    />
  )
  if (maxLength === undefined) return textarea
  return (
    <div className="flex flex-col gap-1">
      {textarea}
      <p
        aria-live={length >= maxLength * ANNOUNCE_FROM ? 'polite' : 'off'}
        className="self-end text-xs text-neutral-400 tabular-nums"
      >
        {characterCountText(length, maxLength)}
      </p>
    </div>
  )
})
