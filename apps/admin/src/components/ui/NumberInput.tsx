import type { ChangeEvent, ComponentPropsWithoutRef, FocusEvent } from 'react'
import { forwardRef, useState } from 'react'
import { cx } from './cx'
import { INPUT_CLASS } from './input-class'
import { formatNumberText, parseNumberText, sanitizeNumberText } from './numeric-text'

/** Props de {@link NumberInput}: las de `<input>` salvo el valor, que es un número. */
export interface NumberInputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode'
> {
  /** Número mayor o igual a 0, o `null` si el campo está vacío. */
  value: number | null
  /** Se llama con el número que queda escrito (o `null` si no hay cifras) en cada cambio. */
  onChange: (value: number | null) => void
  /** Si acepta decimales con coma ("10,5"). Por defecto solo enteros. */
  allowDecimal?: boolean
}

/**
 * Campo numérico con el formato de Argentina, pensado para un `Controller` de React Hook Form.
 *
 * Sin `allowDecimal` acepta solo enteros (lo que sigue a una coma se descarta); con
 * `allowDecimal`, la coma es el separador decimal ("10,5" vale 10.5) y pide el teclado decimal.
 * Los puntos de miles se ignoran y las letras no se escriben. Al salir del campo muestra el
 * número con coma y sin puntos de miles. Vacío vale `null`.
 *
 * @param props - Ver {@link NumberInputProps}. Entrega el ref al `<input>` y llama al `onBlur`
 *   que recibe.
 * @throws {RangeError} Si `value` no es `null` ni un número finito mayor o igual a 0, o si tiene
 *   decimales sin `allowDecimal`.
 * @example
 * <Field label="Stock">
 *   {(control) => <NumberInput {...control} value={field.value} onChange={field.onChange} />}
 * </Field>
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, onBlur, allowDecimal = false, className, ...props },
  ref,
) {
  // Lo que se está escribiendo; `null` cuando el campo muestra el número guardado.
  const [draft, setDraft] = useState<string | null>(null)
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    throw new RangeError(
      `El número tiene que ser finito y mayor o igual a 0; se recibió ${String(value)}.`,
    )
  }
  if (value !== null && !allowDecimal && !Number.isSafeInteger(value)) {
    throw new RangeError(
      `El número tiene que ser un entero porque el campo no acepta decimales; se recibió ${String(value)}.`,
    )
  }
  const formatted = value === null ? '' : formatNumberText(value)
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = sanitizeNumberText(event.target.value, allowDecimal)
    setDraft(text)
    onChange(parseNumberText(text, allowDecimal))
  }
  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setDraft(null)
    onBlur?.(event)
  }
  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={draft ?? formatted}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cx(INPUT_CLASS, 'tabular-nums', className)}
    />
  )
})
