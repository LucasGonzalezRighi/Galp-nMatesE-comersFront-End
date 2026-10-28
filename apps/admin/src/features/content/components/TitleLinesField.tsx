import type { ReactNode } from 'react'
import type { FieldPathByValue, FieldValues } from 'react-hook-form'
import { CONTENT_COPY, removeLineLabel } from '../content.copy'
import { TextListField } from './TextListField'

/** Menos líneas que puede tener un título. */
const MIN_LINES = 1

/** Más líneas que puede tener un título (las de `homeContentFormSchema`). */
const MAX_LINES = 3

/** Largo máximo de cada línea. */
const LINE_MAX_LENGTH = 60

/** Props de {@link TitleLinesField}. */
export interface TitleLinesFieldProps<T extends FieldValues> {
  /** Ruta de las líneas en el formulario, por ejemplo `scenes.2.titleLines`. */
  name: FieldPathByValue<T, string[]>
}

/**
 * "Título en líneas": de 1 a 3 campos "Línea {n}" (hasta 60 caracteres cada uno), con "Agregar
 * línea" y "Quitar la línea {n}".
 *
 * @param props - Ver {@link TitleLinesFieldProps}.
 */
export function TitleLinesField<T extends FieldValues>({
  name,
}: TitleLinesFieldProps<T>): ReactNode {
  return (
    <TextListField<T>
      name={name}
      legend={CONTENT_COPY.titleLines}
      itemNoun={CONTENT_COPY.line}
      addLabel={CONTENT_COPY.addLine}
      removeLabel={removeLineLabel}
      min={MIN_LINES}
      max={MAX_LINES}
      maxLength={LINE_MAX_LENGTH}
    />
  )
}
