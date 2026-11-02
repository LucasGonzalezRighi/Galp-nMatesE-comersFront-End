import type { ReactNode } from 'react'
import type { FieldPathByValue, FieldValues } from 'react-hook-form'
import { TITLE_LINES_LIMITS } from '../content-limits'
import { CONTENT_COPY, removeLineLabel } from '../content.copy'
import { TextListField } from './TextListField'

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
      min={TITLE_LINES_LIMITS.minLines}
      max={TITLE_LINES_LIMITS.maxLines}
      maxLength={TITLE_LINES_LIMITS.line}
    />
  )
}
