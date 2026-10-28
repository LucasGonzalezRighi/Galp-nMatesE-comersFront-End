import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FormProvider, useForm } from 'react-hook-form'
import type { FooterContent } from '@galpon/api-client'
import type {
  FooterContentForm as FooterContentValues,
  FooterContentFormInput,
} from '@galpon/schemas'
import { updateAdminFooterContent } from '@galpon/api-client'
import { adminContentQuery, queryKeys, useApiClient } from '@galpon/api-client/react'
import { footerContentFormSchema } from '@galpon/schemas'
import { FormActions } from '../../../components/ui/FormActions'
import { Section } from '../../../components/ui/Section'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import { footerFormValues } from '../content-form-values'
import { combinedLoadState } from '../content-load-state'
import { CONTENT_COPY, removePaymentMethodLabel } from '../content.copy'
import { useSaveContent } from '../use-save-content'
import { ContentLayout } from './ContentLayout'
import { ContentLoader } from './ContentLoader'
import { TextField } from './TextField'
import { TextListField } from './TextListField'

/** Campo de texto del formulario del pie. */
const FooterText = TextField<FooterContentFormInput>

/** Más medios de pago que admite el pie (los de `footerContentFormSchema`). */
const MAX_PAYMENT_METHODS = 10

/** Props de {@link FooterForm}. */
interface FooterFormProps {
  /** Pie como lo devuelve la API. */
  content: FooterContent
}

/** Formulario del pie de página (`footerContentFormSchema`). */
function FooterForm({ content }: FooterFormProps): ReactNode {
  const api = useApiClient()
  const form = useForm<FooterContentFormInput, undefined, FooterContentValues>({
    resolver: zodResolver(footerContentFormSchema),
    mode: 'onTouched',
    defaultValues: footerFormValues(content),
  })
  const save = useSaveContent({
    queryKey: queryKeys.adminContent('footer'),
    save: (body: FooterContentValues) => updateAdminFooterContent(api, body),
    setError: form.setError,
    onSaved: (saved) => {
      form.reset(footerFormValues(saved))
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
        <Section title={CONTENT_COPY.footer}>
          <FooterText name="tagline" label={CONTENT_COPY.phrase} maxLength={80} />
          <FooterText name="text" label={CONTENT_COPY.text} maxLength={300} multiline />
          <TextListField<FooterContentFormInput>
            name="paymentMethods"
            legend={CONTENT_COPY.paymentMethods}
            itemNoun={CONTENT_COPY.paymentMethod}
            addLabel={CONTENT_COPY.addPaymentMethod}
            removeLabel={removePaymentMethodLabel}
            min={0}
            max={MAX_PAYMENT_METHODS}
            maxLength={40}
          />
          <FooterText
            name="consumerDefenseUrl"
            label={CONTENT_COPY.consumerDefense}
            type="url"
            maxLength={2048}
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
 * Pantalla `/contenido/pie`: la frase, el texto, los medios de pago y el enlace a Defensa del
 * Consumidor del pie de página.
 */
export function FooterContentScreen(): ReactNode {
  const api = useApiClient()
  const content = useQuery(adminContentQuery(api, 'footer'))
  return (
    <ContentLayout>
      <ContentLoader
        state={combinedLoadState([content])}
        onRetry={() => {
          void content.refetch()
        }}
      >
        {content.data !== undefined && <FooterForm content={content.data} />}
      </ContentLoader>
    </ContentLayout>
  )
}
