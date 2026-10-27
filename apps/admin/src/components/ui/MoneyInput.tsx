import type { ChangeEvent, ComponentPropsWithoutRef, FocusEvent } from 'react'
import { forwardRef, useState } from 'react'
import { formatPesos, pesos } from '@galpon/domain'
import { cx } from './cx'
import { INPUT_CLASS } from './input-class'
import { parseMoneyText, sanitizeMoneyText } from './numeric-text'

/** Props de {@link MoneyInput}: las de `<input>` salvo el valor, que es un monto. */
export interface MoneyInputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode'
> {
  /** Monto en pesos enteros, o `null` si el campo está vacío. */
  value: number | null
  /** Se llama con el monto que queda escrito (o `null` si no hay cifras) en cada cambio. */
  onChange: (value: number | null) => void
}

/**
 * Campo de monto en pesos enteros, pensado para un `Controller` de React Hook Form.
 *
 * Pide el teclado numérico y acepta "39999", "39.999" o "$39.999"; las letras se ignoran y lo
 * que sigue a una coma (los centavos) se descarta. Mientras se edita muestra lo escrito y, al
 * salir del campo, el monto con `formatPesos` ("$39.999"). Vacío vale `null`.
 *
 * @param props - Ver {@link MoneyInputProps}. Entrega el ref al `<input>` (para que el
 *   `Controller` le dé el foco) y llama al `onBlur` que recibe.
 * @throws {RangeError} Si `value` no es `null` ni un entero de pesos mayor o igual a 0.
 * @example
 * <Field label="Precio">
 *   {(control) => <MoneyInput {...control} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />}
 * </Field>
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, onBlur, className, ...props },
  ref,
) {
  // Lo que se está escribiendo; `null` cuando el campo muestra el monto con formato.
  const [draft, setDraft] = useState<string | null>(null)
  const formatted = value === null ? '' : formatPesos(pesos(value))
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = sanitizeMoneyText(event.target.value)
    setDraft(text)
    onChange(parseMoneyText(text))
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
      inputMode="numeric"
      value={draft ?? formatted}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cx(INPUT_CLASS, 'tabular-nums', className)}
    />
  )
})
