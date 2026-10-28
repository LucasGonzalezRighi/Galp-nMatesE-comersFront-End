import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from '@phosphor-icons/react'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'
import type { FaqContent } from '@galpon/api-client'
import type { FaqContentForm as FaqContentValues, FaqContentFormInput } from '@galpon/schemas'
import { updateAdminFaqContent } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { faqContentFormSchema } from '@galpon/schemas'
import { Button } from '../../../components/ui/Button'
import { FormActions } from '../../../components/ui/FormActions'
import { Section } from '../../../components/ui/Section'
import { SortableList } from '../../../components/ui/SortableList'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import { faqFormValues } from '../content-form-values'
import { CONTENT_COPY } from '../content.copy'
import { fieldIndex, findMove, repeatedIndexes } from '../list-utils'
import { useSaveContent } from '../use-save-content'
import { FaqCategoryFields } from './FaqCategoryFields'

/** Más categorías que admite la página (las de `faqContentFormSchema`). */
const MAX_CATEGORIES = 10

/** Props de {@link FaqContentForm}. */
export interface FaqContentFormProps {
  /** Preguntas como las devuelve la API. */
  content: FaqContent
}

/**
 * Formulario de preguntas frecuentes (`faqContentFormSchema`): categorías con sus preguntas,
 * reordenables con "Subir" / "Bajar" (o arrastrando). Antes de enviar revisa que no haya dos
 * categorías con el mismo identificador (va en la URL y es la clave de la lista), algo que el
 * schema no controla. Guarda con `PUT /admin/content/faq`.
 *
 * @param props - Ver {@link FaqContentFormProps}.
 */
export function FaqContentForm({ content }: FaqContentFormProps): ReactNode {
  const api = useApiClient()
  const form = useForm<FaqContentFormInput, undefined, FaqContentValues>({
    resolver: zodResolver(faqContentFormSchema),
    mode: 'onTouched',
    defaultValues: faqFormValues(content),
  })
  const categories = useFieldArray({ control: form.control, name: 'categories' })
  const save = useSaveContent({
    queryKey: queryKeys.adminContent('faq'),
    save: (body: FaqContentValues) => updateAdminFaqContent(api, body),
    setError: form.setError,
    onSaved: (saved) => {
      form.reset(faqFormValues(saved))
    },
  })
  const submit = form.handleSubmit((values) => {
    const repeated = repeatedIndexes(values.categories.map((category) => category.id))
    if (repeated.length > 0) {
      repeated.forEach((index, order) => {
        form.setError(
          `categories.${fieldIndex(index)}.id`,
          { type: 'duplicate', message: CONTENT_COPY.duplicateCategoryId },
          { shouldFocus: order === 0 },
        )
      })
      return
    }
    save.mutate(values)
  })
  const { isDirty } = form.formState

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          void submit(event)
        }}
        className="flex flex-col gap-6"
      >
        <Section title={CONTENT_COPY.categories}>
          <SortableList
            items={categories.fields}
            getKey={(field) => field.id}
            label={CONTENT_COPY.categories}
            onReorder={(next) => {
              const move = findMove(
                categories.fields.map((field) => field.id),
                next.map((field) => field.id),
              )
              if (move !== null) categories.move(move.from, move.to)
            }}
            renderItem={(field, helpers) => {
              const index = categories.fields.findIndex((candidate) => candidate.id === field.id)
              return (
                <FaqCategoryFields
                  index={index}
                  helpers={helpers}
                  onRemove={
                    categories.fields.length > 1
                      ? () => {
                          categories.remove(index)
                        }
                      : undefined
                  }
                />
              )
            }}
          />
          {categories.fields.length < MAX_CATEGORIES && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => {
                categories.append({ id: '', label: '', items: [{ question: '', answer: '' }] })
              }}
            >
              <PlusIcon size={18} weight="regular" aria-hidden="true" />
              {CONTENT_COPY.addCategory}
            </Button>
          )}
        </Section>
        <FormActions
          isDirty={isDirty}
          isSubmitting={save.isPending}
          onDiscard={() => {
            form.reset()
          }}
        />
        <UnsavedChangesGuard when={isDirty} />
      </form>
    </FormProvider>
  )
}
