import type { ReactNode } from 'react'
import { PlusIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import type { FaqContentFormInput } from '@galpon/schemas'
import { slugify } from '@galpon/domain'
import type { SortableItemHelpers } from '../../../components/ui/SortableList'
import { Button } from '../../../components/ui/Button'
import { SortableList } from '../../../components/ui/SortableList'
import { FAQ_LIMITS } from '../content-limits'
import { CONTENT_COPY, positionLabel, questionName, questionsListLabel } from '../content.copy'
import { fieldIndex, findMove } from '../list-utils'
import { FieldGroup } from './FieldGroup'
import { ItemActions } from './ItemActions'
import { TextField } from './TextField'

/** Campo de texto del formulario de preguntas. */
const FaqText = TextField<FaqContentFormInput>

/** Props de {@link FaqCategoryFields}. */
export interface FaqCategoryFieldsProps {
  /** Lugar de la categoría en el formulario, desde 0. */
  index: number
  /** Lo que `SortableList` le pasa a la categoría: mover y la agarradera. */
  helpers: SortableItemHelpers
  /** Quita la categoría; sin esta función no se puede quitar (es la única). */
  onRemove?: () => void
}

/**
 * Una categoría de preguntas frecuentes: "Nombre", "Identificador" (en `font-mono`; en una
 * categoría nueva sigue a `slugify(nombre)` hasta que se lo cambia a mano, y la ayuda dice que se
 * completa solo mientras lo sigue) y sus preguntas ("Pregunta" y "Respuesta"), que se reordenan
 * con `SortableList` y se agregan con "Agregar pregunta". Va dentro del `FormProvider` de
 * preguntas.
 *
 * @param props - Ver {@link FaqCategoryFieldsProps}.
 */
export function FaqCategoryFields({ index, helpers, onRemove }: FaqCategoryFieldsProps): ReactNode {
  const { control, getValues, setValue, getFieldState } = useFormContext<FaqContentFormInput>()
  const items = useFieldArray({ control, name: `categories.${fieldIndex(index)}.items` })
  const label = useWatch({ control, name: `categories.${fieldIndex(index)}.label` })
  // Una categoría nueva llega sin identificador: ese, y solo ese, sigue al nombre.
  const [followsLabel, setFollowsLabel] = useState(
    () => getValues(`categories.${fieldIndex(index)}.id`) === '',
  )
  const name = label.trim() === '' ? positionLabel(CONTENT_COPY.category, index + 1) : label.trim()

  return (
    <FieldGroup
      title={name}
      actions={<ItemActions name={name} helpers={helpers} onRemove={onRemove} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FaqText
          name={`categories.${fieldIndex(index)}.label`}
          label={CONTENT_COPY.categoryName}
          maxLength={FAQ_LIMITS.categoryLabel}
          onValueChange={(value) => {
            if (!followsLabel) return
            const idPath = `categories.${fieldIndex(index)}.id` as const
            setValue(idPath, slugify(value), {
              shouldDirty: true,
              shouldValidate: getFieldState(idPath).invalid,
            })
          }}
        />
        <FaqText
          name={`categories.${fieldIndex(index)}.id`}
          label={CONTENT_COPY.categoryId}
          hint={followsLabel ? CONTENT_COPY.categoryIdAutoHint : CONTENT_COPY.categoryIdHint}
          maxLength={FAQ_LIMITS.categoryId}
          monospace
          onValueChange={() => {
            setFollowsLabel(false)
          }}
        />
      </div>
      <SortableList
        items={items.fields}
        getKey={(item) => item.id}
        label={questionsListLabel(name)}
        onReorder={(next) => {
          const move = findMove(
            items.fields.map((item) => item.id),
            next.map((item) => item.id),
          )
          if (move !== null) items.move(move.from, move.to)
        }}
        renderItem={(item, itemHelpers) => {
          const at = items.fields.findIndex((candidate) => candidate.id === item.id)
          const itemName = questionName(at + 1, name)
          return (
            <FieldGroup
              title={positionLabel(CONTENT_COPY.question, at + 1)}
              level={4}
              actions={
                <ItemActions
                  name={itemName}
                  helpers={itemHelpers}
                  onRemove={
                    items.fields.length > 1
                      ? () => {
                          items.remove(at)
                        }
                      : undefined
                  }
                />
              }
            >
              <FaqText
                name={`categories.${fieldIndex(index)}.items.${fieldIndex(at)}.question`}
                label={CONTENT_COPY.question}
                maxLength={FAQ_LIMITS.question}
              />
              <FaqText
                name={`categories.${fieldIndex(index)}.items.${fieldIndex(at)}.answer`}
                label={CONTENT_COPY.answer}
                maxLength={FAQ_LIMITS.answer}
                multiline
                rows={4}
              />
            </FieldGroup>
          )
        }}
      />
      {items.fields.length < FAQ_LIMITS.questions && (
        <Button
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => {
            items.append({ question: '', answer: '' })
          }}
        >
          <PlusIcon size={18} weight="regular" aria-hidden="true" />
          {CONTENT_COPY.addQuestion}
        </Button>
      )}
    </FieldGroup>
  )
}
