import type { ReactNode } from 'react'
import { useId } from 'react'
import { cx } from './cx'

/** Atributos que {@link Field} entrega al control para conectarlo con su label, ayuda y error. */
export interface FieldControlProps {
  /** Id del control, al que apunta el `htmlFor` del label. */
  id: string
  /** `true` si hay un error. */
  'aria-invalid': true | undefined
  /** Ids de la ayuda y del error (en ese orden), o `undefined` si no hay ninguno. */
  'aria-describedby': string | undefined
  /** `true` si el campo es obligatorio. */
  'aria-required': true | undefined
}

/** Props de {@link Field}. */
export interface FieldProps {
  /** Texto del label. */
  label: string
  /** Ayuda debajo del control, en `neutral-400`. */
  hint?: ReactNode
  /** Mensaje de error (por ejemplo `errors.name?.message`); marca el control como inválido. */
  error?: string
  /** Agrega " *" al label (oculto a la tecnología asistiva) y `aria-required` al control. */
  required?: boolean
  /** Clases extra del contenedor, para la disposición (ancho, columnas). */
  className?: string
  /** Dibuja el control con los atributos que recibe (ver {@link FieldControlProps}). */
  children: (control: FieldControlProps) => ReactNode
}

/**
 * Campo de formulario: label de 12 px al 70 %, el control, la ayuda y el error, conectados por
 * `id` y `aria-describedby`. El error tiene el id `{id}-error` y la ayuda `{id}-hint`.
 *
 * Sirve para `TextInput`, `Textarea`, `Select`, `MoneyInput` y `NumberInput`. `Checkbox`,
 * `Switch` y `SegmentedControl` traen su propio label.
 *
 * @param props - Ver {@link FieldProps}.
 * @throws {RangeError} Si `label` está vacío.
 * @example
 * <Field label="Nombre" error={errors.name?.message} required>
 *   {(control) => <TextInput {...control} {...register('name')} />}
 * </Field>
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: FieldProps): ReactNode {
  const id = useId()
  if (label.trim() === '') {
    throw new RangeError('El label del campo no puede estar vacío.')
  }
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const hasHint = hint !== undefined && hint !== null && hint !== ''
  const hasError = error !== undefined && error !== ''
  const describedBy = cx(hasHint && hintId, hasError && errorId)
  const control: FieldControlProps = {
    id,
    'aria-invalid': hasError ? true : undefined,
    'aria-describedby': describedBy === '' ? undefined : describedBy,
    'aria-required': required ? true : undefined,
  }
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-foreground/70 text-xs">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children(control)}
      {hasHint && (
        <p id={hintId} className="text-xs text-neutral-400">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-danger text-xs">
          {error}
        </p>
      )}
    </div>
  )
}
