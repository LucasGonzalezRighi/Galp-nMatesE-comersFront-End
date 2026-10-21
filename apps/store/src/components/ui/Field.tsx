import type { ReactNode } from 'react'
import { useId } from 'react'
import { cx } from './cx'

/** Atributos que `Field` entrega al campo para enlazarlo con su etiqueta y sus mensajes. */
export interface FieldControlProps {
  /** Identificador del campo, al que apunta la etiqueta (`htmlFor`). */
  id: string
  /** Ids de la ayuda y del error, o `undefined` si no hay ninguno. */
  'aria-describedby': string | undefined
  /** `true` cuando hay un error; `undefined` si no, para no escribir el atributo. */
  'aria-invalid': true | undefined
}

/** Props de {@link Field}. */
export interface FieldProps {
  /** Texto de la etiqueta, visible sobre el campo (12 px al 70 %). */
  label: ReactNode
  /** Mensaje de error del campo. Con texto, el campo queda `aria-invalid` y descrito por el mensaje. */
  error?: string | null
  /** Ayuda breve bajo el campo. También forma parte de la descripción accesible. */
  hint?: string
  /** Identificador del campo. Por defecto se genera uno. */
  id?: string
  /** Clases extra del contenedor, por ejemplo para ubicarlo en una grilla. */
  className?: string
  /** Recibe los atributos de accesibilidad y devuelve el campo (`Input`, `Textarea`, `Select`…). */
  children: (control: FieldControlProps) => ReactNode
}

/**
 * Etiqueta, campo y mensaje de error de un formulario (`.field` del diseño), con la accesibilidad
 * resuelta: la etiqueta apunta al campo, el error lo describe con `aria-describedby` y lo marca con
 * `aria-invalid`, y se anuncia en una región `aria-live="polite"`.
 *
 * @param props - Ver {@link FieldProps}.
 * @example
 * <Field label="Correo" error={errors.email}>
 *   {(control) => <Input type="email" autoComplete="email" {...control} />}
 * </Field>
 */
export function Field({ label, error, hint, id, className, children }: FieldProps): ReactNode {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const hintId = `${controlId}-hint`
  const errorId = `${controlId}-error`
  const hasHint = hint !== undefined && hint !== ''
  const hasError = error !== undefined && error !== null && error !== ''
  const describedBy = [hasHint ? hintId : null, hasError ? errorId : null].filter(
    (value) => value !== null,
  )

  return (
    <div className={cx('flex flex-col', className)}>
      <label htmlFor={controlId} className="text-foreground/70 mb-[5px] block text-[12px]">
        {label}
      </label>
      {children({
        id: controlId,
        'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
        'aria-invalid': hasError ? true : undefined,
      })}
      {hasHint ? (
        <p id={hintId} className="text-foreground/55 mt-[5px] block text-[12px]">
          {hint}
        </p>
      ) : null}
      <div aria-live="polite">
        {hasError ? (
          <p id={errorId} className="text-danger mt-[5px] block text-[12px]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
