import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FormProvider, useForm } from 'react-hook-form'
import type { ProductGroup, ProductTabsContent } from '@galpon/api-client'
import type {
  ProductTabsContentForm as ProductTabsContentValues,
  ProductTabsContentFormInput,
} from '@galpon/schemas'
import { updateAdminProductTabsContent } from '@galpon/api-client'
import { adminContentQuery, queryKeys, useApiClient } from '@galpon/api-client/react'
import { productTabsContentFormSchema } from '@galpon/schemas'
import { FormActions } from '../../../components/ui/FormActions'
import { Section } from '../../../components/ui/Section'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import { productTabsFormValues } from '../content-form-values'
import { combinedLoadState } from '../content-load-state'
import { CONTENT_COPY } from '../content.copy'
import { useSaveContent } from '../use-save-content'
import { ContentLayout } from './ContentLayout'
import { ContentLoader } from './ContentLoader'
import { TextField } from './TextField'

/** Campo de texto del formulario de las pestañas. */
const TabsText = TextField<ProductTabsContentFormInput>

/** Grupos, en el orden en que se muestran. */
const GROUPS = ['mate', 'bombilla', 'yerba'] as const satisfies readonly ProductGroup[]

/** Props de {@link ProductTabsForm}. */
interface ProductTabsFormProps {
  /** Pestañas como las devuelve la API. */
  content: ProductTabsContent
}

/** Formulario de las pestañas de la ficha (`productTabsContentFormSchema`). */
function ProductTabsForm({ content }: ProductTabsFormProps): ReactNode {
  const api = useApiClient()
  const form = useForm<ProductTabsContentFormInput, undefined, ProductTabsContentValues>({
    resolver: zodResolver(productTabsContentFormSchema),
    mode: 'onTouched',
    defaultValues: productTabsFormValues(content),
  })
  const save = useSaveContent({
    queryKey: queryKeys.adminContent('product-tabs'),
    save: (body: ProductTabsContentValues) => updateAdminProductTabsContent(api, body),
    setError: form.setError,
    onSaved: (saved) => {
      form.reset(productTabsFormValues(saved))
    },
  })
  const submit = form.handleSubmit((values) => {
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
        {GROUPS.map((group) => (
          <Section key={group} title={CONTENT_COPY.groups[group]}>
            <TabsText
              name={`${group}.descriptionNote`}
              label={CONTENT_COPY.descriptionNote}
              maxLength={600}
              multiline
            />
            <TabsText
              name={`${group}.materialsTitle`}
              label={CONTENT_COPY.materialsTitle}
              maxLength={30}
            />
            <TabsText
              name={`${group}.materials`}
              label={CONTENT_COPY.materials}
              maxLength={2000}
              multiline
              rows={5}
            />
            <TabsText name={`${group}.careTitle`} label={CONTENT_COPY.careTitle} maxLength={30} />
            <TabsText
              name={`${group}.care`}
              label={CONTENT_COPY.care}
              maxLength={2000}
              multiline
              rows={5}
            />
          </Section>
        ))}
        <Section title={CONTENT_COPY.allGroups}>
          <TabsText
            name="shipping"
            label={CONTENT_COPY.shipping}
            maxLength={2000}
            multiline
            rows={5}
          />
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

/**
 * Pantalla `/contenido/pestanas`: los textos de fábrica de las pestañas de la ficha de cada grupo
 * ("Mates", "Bombillas", "Yerbas") y el de envío y cambios, común a todos.
 */
export function ProductTabsContentScreen(): ReactNode {
  const api = useApiClient()
  const content = useQuery(adminContentQuery(api, 'product-tabs'))
  return (
    <ContentLayout>
      <ContentLoader
        state={combinedLoadState([content])}
        onRetry={() => {
          void content.refetch()
        }}
      >
        {content.data !== undefined && <ProductTabsForm content={content.data} />}
      </ContentLoader>
    </ContentLayout>
  )
}
