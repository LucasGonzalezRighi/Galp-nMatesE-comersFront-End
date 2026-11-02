import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { WarningIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { LegalContent, LegalDocument } from '@galpon/api-client'
import type { LegalContentForm as LegalContentValues, LegalContentFormInput } from '@galpon/schemas'
import { updateAdminLegalContent } from '@galpon/api-client'
import { adminLegalContentQuery, queryKeys, useApiClient } from '@galpon/api-client/react'
import { arDayKey } from '@galpon/domain'
import { legalContentFormSchema } from '@galpon/schemas'
import type { LegalTab } from '../legal-search'
import { FormActions } from '../../../components/ui/FormActions'
import { Section } from '../../../components/ui/Section'
import { Tabs } from '../../../components/ui/Tabs'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import { legalFormValues } from '../content-form-values'
import { LEGAL_LIMITS } from '../content-limits'
import { combinedLoadState } from '../content-load-state'
import { CONTENT_COPY } from '../content.copy'
import { LEGAL_TAB_DOCUMENTS, LEGAL_TABS } from '../legal-search'
import { useSaveContent } from '../use-save-content'
import { ContentLayout } from './ContentLayout'
import { ContentLoader } from './ContentLoader'
import { TextField } from './TextField'

/** Campo de texto del formulario de un documento legal. */
const LegalText = TextField<LegalContentFormInput>

/** Nombre de cada documento. */
const TAB_LABELS: Readonly<Record<LegalTab, string>> = {
  terminos: CONTENT_COPY.terms,
  privacidad: CONTENT_COPY.privacy,
}

/** Pestañas de los documentos, en orden. */
const TAB_ITEMS = LEGAL_TABS.map((value) => ({ value, label: TAB_LABELS[value] }))

/** Props de {@link LegalForm}. */
interface LegalFormProps {
  /** Documento que se edita. */
  document: LegalDocument
  /** Su nombre ("Términos y condiciones"), título de la sección. */
  title: string
  /** El documento como lo devuelve la API. */
  content: LegalContent
}

/**
 * Formulario de un documento legal (`legalContentFormSchema`). Al cambiar el texto propone como
 * "Última actualización" el día de hoy en Buenos Aires, salvo que la fecha se haya tocado a mano.
 */
function LegalForm({ document, title, content }: LegalFormProps): ReactNode {
  const api = useApiClient()
  const form = useForm<LegalContentFormInput, undefined, LegalContentValues>({
    resolver: zodResolver(legalContentFormSchema),
    mode: 'onTouched',
    defaultValues: legalFormValues(content),
  })
  const dateEdited = useRef(false)
  const save = useSaveContent({
    queryKey: queryKeys.adminLegalContent(document),
    save: (body: LegalContentValues) => updateAdminLegalContent(api, document, body),
    setError: form.setError,
    getValues: form.getValues,
    onSaved: (saved) => {
      dateEdited.current = false
      form.reset(legalFormValues(saved))
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
        <Section title={title}>
          <LegalText name="title" label={CONTENT_COPY.heading} maxLength={LEGAL_LIMITS.title} />
          <LegalText
            name="updatedAt"
            label={CONTENT_COPY.updatedAt}
            hint={CONTENT_COPY.updatedAtHint}
            type="date"
            onValueChange={() => {
              dateEdited.current = true
            }}
          />
          <LegalText
            name="body"
            label={CONTENT_COPY.text}
            maxLength={LEGAL_LIMITS.body}
            multiline
            rows={20}
            onValueChange={() => {
              if (dateEdited.current) return
              form.setValue('updatedAt', arDayKey(new Date()), {
                shouldDirty: true,
                shouldValidate: form.getFieldState('updatedAt').invalid,
              })
            }}
          />
        </Section>
        <FormActions
          isDirty={isDirty}
          isSubmitting={save.isPending}
          onDiscard={() => {
            dateEdited.current = false
            form.reset()
          }}
        />
        <UnsavedChangesGuard when={isDirty} />
      </form>
    </FormProvider>
  )
}

/** Props de {@link LegalContentScreen}. */
export interface LegalContentScreenProps {
  /** Documento elegido (`?documento=` ya validado). */
  tab: LegalTab
  /** Elige otro documento (cambia la URL). */
  onTabChange: (tab: LegalTab) => void
}

/**
 * Pantalla `/contenido/legales`: pestañas "Términos y condiciones" y "Política de privacidad"
 * (`?documento=terminos|privacidad`), el aviso de revisarlos con un profesional y el formulario del
 * documento elegido (título, última actualización y texto).
 *
 * @param props - Ver {@link LegalContentScreenProps}.
 */
export function LegalContentScreen({ tab, onTabChange }: LegalContentScreenProps): ReactNode {
  const api = useApiClient()
  const document = LEGAL_TAB_DOCUMENTS[tab]
  const content = useQuery(adminLegalContentQuery(api, document))
  return (
    <ContentLayout>
      <p
        role="note"
        className="border-divider bg-surface flex items-start gap-2 rounded-lg border p-4 text-sm"
      >
        <WarningIcon
          size={18}
          weight="regular"
          aria-hidden="true"
          className="text-accent shrink-0"
        />
        {CONTENT_COPY.legalWarning}
      </p>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = LEGAL_TABS.find((candidate) => candidate === value)
          if (next !== undefined) onTabChange(next)
        }}
        label={CONTENT_COPY.legalTabs}
        items={TAB_ITEMS}
      >
        <ContentLoader
          state={combinedLoadState([content])}
          onRetry={() => {
            void content.refetch()
          }}
        >
          {content.data !== undefined && (
            <LegalForm
              key={document}
              document={document}
              title={TAB_LABELS[tab]}
              content={content.data}
            />
          )}
        </ContentLoader>
      </Tabs>
    </ContentLayout>
  )
}
