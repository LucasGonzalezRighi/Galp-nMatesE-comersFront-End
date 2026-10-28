import type { ReactNode } from 'react'
import type { FieldPathByValue, FieldValues } from 'react-hook-form'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { TextInput } from '../../../components/ui/TextInput'
import { positionLabel } from '../content.copy'
import { listFieldErrors } from '../list-utils'

/** Props de {@link TextListField}. */
export interface TextListFieldProps<T extends FieldValues> {
  /** Ruta de la lista de textos en el formulario, por ejemplo `hero.titleLines`. */
  name: FieldPathByValue<T, string[]>
  /** Nombre del grupo, por ejemplo "Título en líneas". */
  legend: string
  /** Nombre de cada texto, al que se le suma el lugar ("Línea" → "Línea 2"). */
  itemNoun: string
  /** Botón que agrega un texto vacío al final. */
  addLabel: string
  /** Nombre del botón que quita el texto de un lugar (desde 1). */
  removeLabel: (position: number) => string
  /** Menor cantidad de textos: con esa cantidad no se puede quitar. */
  min: number
  /** Mayor cantidad de textos: con esa cantidad no se puede agregar. */
  max: number
  /** Máximo de caracteres de cada texto. */
  maxLength: number
}

/**
 * Lista de textos cortos de un formulario de contenido (las líneas de un título, los medios de
 * pago): un campo por texto con su botón de quitar y "Agregar …" al final. Al agregar, el foco va
 * al campo nuevo; al quitar, al campo que queda en ese lugar (o al anterior).
 *
 * @param props - Ver {@link TextListFieldProps}.
 * @throws {RangeError} Si `min` y `max` no son enteros con `0 ≤ min ≤ max` y `max ≥ 1`.
 */
export function TextListField<T extends FieldValues>({
  name,
  legend,
  itemNoun,
  addLabel,
  removeLabel,
  min,
  max,
  maxLength,
}: TextListFieldProps<T>): ReactNode {
  const { control } = useFormContext<T>()
  const { field, fieldState } = useController({ control, name })
  const raw: unknown = field.value
  const values = Array.isArray(raw)
    ? raw.map((value: unknown) => (typeof value === 'string' ? value : ''))
    : []
  const errors = listFieldErrors(fieldState.error, values.length)
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const focusIndex = useRef<number | null>(null)

  useEffect(() => {
    const index = focusIndex.current
    if (index === null) return
    focusIndex.current = null
    inputs.current[index]?.focus()
  })

  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 0 ||
    max < Math.max(1, min)
  ) {
    throw new RangeError(
      `La lista "${legend}" necesita 0 ≤ mínimo ≤ máximo y un máximo desde 1; se recibió ${String(min)} y ${String(max)}.`,
    )
  }

  const change = (next: string[]) => {
    field.onChange(next)
  }

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="text-foreground/70 mb-2 p-0 text-xs">{legend}</legend>
      {values.map((value, index) => (
        <Field key={index} label={positionLabel(itemNoun, index + 1)} error={errors.items[index]}>
          {(controlProps) => (
            <div className="flex items-center gap-2">
              <TextInput
                {...controlProps}
                ref={(element) => {
                  inputs.current[index] = element
                }}
                value={value}
                maxLength={maxLength}
                onChange={(event) => {
                  change(values.map((line, at) => (at === index ? event.target.value : line)))
                }}
                onBlur={field.onBlur}
                className="flex-1"
              />
              {values.length > min && (
                <Button
                  variant="icon"
                  aria-label={removeLabel(index + 1)}
                  onClick={() => {
                    focusIndex.current = Math.max(0, Math.min(index, values.length - 2))
                    change(values.filter((_, at) => at !== index))
                  }}
                >
                  <XIcon size={18} weight="regular" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </Field>
      ))}
      {errors.list !== undefined && (
        <p role="alert" className="text-danger text-xs">
          {errors.list}
        </p>
      )}
      {values.length < max && (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => {
            focusIndex.current = values.length
            change([...values, ''])
          }}
        >
          <PlusIcon size={18} weight="regular" aria-hidden="true" />
          {addLabel}
        </Button>
      )}
    </fieldset>
  )
}
