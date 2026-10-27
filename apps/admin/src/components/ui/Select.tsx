import type { ComponentPropsWithoutRef } from 'react'
import { forwardRef } from 'react'
import { cx } from './cx'
import { SELECT_CLASS } from './input-class'

/** Una opción de {@link Select}. */
export interface SelectOption {
  /** Valor que se envía. */
  value: string
  /** Texto visible. */
  label: string
}

/** Props de {@link Select}: las de `<select>` más las opciones y el placeholder. */
export interface SelectProps extends Omit<ComponentPropsWithoutRef<'select'>, 'children'> {
  /** Opciones, en el orden en que se muestran. Los valores no se repiten. */
  options: readonly SelectOption[]
  /**
   * Texto de una primera opción deshabilitada (con valor vacío), que se ve elegida mientras el
   * campo no tenga valor, por ejemplo "Elegí un material".
   */
  placeholder?: string
}

/**
 * Lista desplegable nativa con las medidas de `.input` (alto mínimo de 36 px).
 *
 * Entrega el ref al `<select>`, así funciona con `register` de React Hook Form.
 *
 * @param props - Ver {@link SelectProps}.
 * @throws {RangeError} Si dos opciones tienen el mismo valor.
 * @example
 * <Field label="Material">
 *   {(control) => (
 *     <Select {...control} placeholder="Elegí un material" options={materials} {...register('material')} />
 *   )}
 * </Field>
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, value, defaultValue, ...props },
  ref,
) {
  const values = new Set(options.map((option) => option.value))
  if (values.size !== options.length) {
    throw new RangeError('Las opciones de la lista no pueden tener valores repetidos.')
  }
  // Sin valor, el navegador elegiría la primera opción habilitada: se elige el placeholder.
  const initialValue =
    placeholder !== undefined && value === undefined && defaultValue === undefined
      ? ''
      : defaultValue
  return (
    <select
      {...props}
      ref={ref}
      value={value}
      defaultValue={initialValue}
      className={cx(SELECT_CLASS, className)}
    >
      {placeholder !== undefined && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
})
