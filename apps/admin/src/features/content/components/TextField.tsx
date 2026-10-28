import type { ChangeEvent, ReactNode } from 'react'
import type { FieldPath, FieldValues } from 'react-hook-form'
import { useFormContext } from 'react-hook-form'
import { Field } from '../../../components/ui/Field'
import { Textarea } from '../../../components/ui/Textarea'
import { TextInput } from '../../../components/ui/TextInput'

/** Props de {@link TextField}. */
export interface TextFieldProps<T extends FieldValues> {
  /** Ruta del campo en el formulario, por ejemplo `scenes.2.text`. */
  name: FieldPath<T>
  /** Texto del label. */
  label: string
  /** Máximo de caracteres (el del schema); en un área de texto, con contador. */
  maxLength?: number
  /** Área de texto de varias líneas en lugar de un campo de una línea. */
  multiline?: boolean
  /** Alto del área de texto, en líneas. */
  rows?: number
  /** Tipo del campo de una línea (`text` por omisión). */
  type?: 'text' | 'url' | 'date'
  /** Ayuda debajo del campo. */
  hint?: string
  /** Se llama con el texto nuevo cada vez que la persona lo cambia. */
  onValueChange?: (value: string) => void
}

/**
 * Campo de texto de un formulario de contenido: `Field` con `TextInput` o `Textarea`, registrado
 * en el formulario del `FormProvider` y con el error de su ruta.
 *
 * @param props - Ver {@link TextFieldProps}.
 * @example
 * <TextField<HomeContentFormInput> name="hero.eyebrow" label="Antetítulo" maxLength={60} />
 */
export function TextField<T extends FieldValues>({
  name,
  label,
  maxLength,
  multiline = false,
  rows,
  type = 'text',
  hint,
  onValueChange,
}: TextFieldProps<T>): ReactNode {
  const { register, getFieldState, formState } = useFormContext<T>()
  const { error } = getFieldState(name, formState)
  const registration = register(name, {
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onValueChange?.(event.target.value)
    },
  })
  return (
    <Field label={label} hint={hint} error={error?.message}>
      {(control) =>
        multiline ? (
          <Textarea {...control} maxLength={maxLength} rows={rows} {...registration} />
        ) : (
          <TextInput {...control} type={type} maxLength={maxLength} {...registration} />
        )
      }
    </Field>
  )
}
