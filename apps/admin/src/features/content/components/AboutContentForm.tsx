import type { ReactNode, SubmitEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from '@phosphor-icons/react'
import { useCallback, useRef, useState } from 'react'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'
import type { AboutContent } from '@galpon/api-client'
import type { AboutContentForm as AboutContentValues, AboutContentFormInput } from '@galpon/schemas'
import { updateAdminAboutContent } from '@galpon/api-client'
import { queryKeys, useApiClient } from '@galpon/api-client/react'
import { aboutContentFormSchema } from '@galpon/schemas'
import type { UploadStatus } from '../../../components/media/media.types'
import { Button } from '../../../components/ui/Button'
import { FormActions } from '../../../components/ui/FormActions'
import { Section } from '../../../components/ui/Section'
import { toast } from '../../../components/ui/toast'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import { aboutFormValues, aboutPhotoUrls } from '../content-form-values'
import { ABOUT_LIMITS } from '../content-limits'
import { CONTENT_COPY, positionLabel } from '../content.copy'
import { fieldIndex } from '../list-utils'
import { useSaveContent } from '../use-save-content'
import { FieldGroup } from './FieldGroup'
import { PartnerFields } from './PartnerFields'
import { TextField } from './TextField'
import { TitleLinesField } from './TitleLinesField'

/** Campo de texto del formulario de Nosotros. */
const AboutText = TextField<AboutContentFormInput>

/** Props de {@link AboutContentForm}. */
export interface AboutContentFormProps {
  /** Nosotros como lo devuelve la API. */
  content: AboutContent
}

/**
 * Formulario de Nosotros (`aboutContentFormSchema`): portada, socios (hasta 8, con foto), frase,
 * "Cómo trabajamos" y el botón a la tienda. Guarda con `PUT /admin/content/about`, con las fotos
 * como `ImageInput`. No envía mientras una foto sube o quedó con error.
 *
 * @param props - Ver {@link AboutContentFormProps}.
 */
export function AboutContentForm({ content }: AboutContentFormProps): ReactNode {
  const api = useApiClient()
  const form = useForm<AboutContentFormInput, undefined, AboutContentValues>({
    resolver: zodResolver(aboutContentFormSchema),
    mode: 'onTouched',
    defaultValues: aboutFormValues(content),
  })
  const partners = useFieldArray({ control: form.control, name: 'partners' })
  const [photoUrls, setPhotoUrls] = useState(() => aboutPhotoUrls(content))
  const uploads = useRef(new Map<string, Exclude<UploadStatus, 'done'>>())
  const save = useSaveContent({
    queryKey: queryKeys.adminContent('about'),
    save: (body: AboutContentValues) => updateAdminAboutContent(api, body),
    setError: form.setError,
    getValues: form.getValues,
    onSaved: (saved) => {
      setPhotoUrls((urls) => ({ ...urls, ...aboutPhotoUrls(saved) }))
      form.reset(aboutFormValues(saved))
    },
  })
  const submit = form.handleSubmit((values) => {
    save.mutate(values)
  })
  const handlePhotoUploaded = useCallback((publicId: string, url: string) => {
    setPhotoUrls((urls) => ({ ...urls, [publicId]: url }))
  }, [])
  const handleUploadStatus = useCallback(
    (key: string, status: Exclude<UploadStatus, 'done'> | null) => {
      if (status === null) uploads.current.delete(key)
      else uploads.current.set(key, status)
    },
    [],
  )
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    const statuses = [...uploads.current.values()]
    if (statuses.includes('uploading') || statuses.includes('error')) {
      event.preventDefault()
      toast.error(
        statuses.includes('uploading') ? CONTENT_COPY.waitForUploads : CONTENT_COPY.failedUploads,
      )
      return
    }
    void submit(event)
  }
  const { isDirty } = form.formState

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Section title={CONTENT_COPY.hero}>
          <AboutText
            name="hero.eyebrow"
            label={CONTENT_COPY.eyebrow}
            maxLength={ABOUT_LIMITS.eyebrow}
          />
          <TitleLinesField<AboutContentFormInput> name="hero.titleLines" />
          <AboutText
            name="hero.text"
            label={CONTENT_COPY.text}
            maxLength={ABOUT_LIMITS.text}
            multiline
          />
        </Section>
        <Section title={CONTENT_COPY.partners} description={CONTENT_COPY.partnersHint}>
          {partners.fields.map((field, index) => (
            <PartnerFields
              key={field.id}
              index={index}
              photoUrls={photoUrls}
              onPhotoUploaded={handlePhotoUploaded}
              uploadKey={field.id}
              onUploadStatus={handleUploadStatus}
              onRemove={() => {
                partners.remove(index)
              }}
            />
          ))}
          {partners.fields.length < ABOUT_LIMITS.partners && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => {
                partners.append({ name: '', role: '', photo: null })
              }}
            >
              <PlusIcon size={18} weight="regular" aria-hidden="true" />
              {CONTENT_COPY.addPartner}
            </Button>
          )}
        </Section>
        <Section title={CONTENT_COPY.phrase}>
          <AboutText
            name="quote"
            label={CONTENT_COPY.phrase}
            maxLength={ABOUT_LIMITS.quote}
            multiline
          />
        </Section>
        <Section title={CONTENT_COPY.howWeWork}>
          <AboutText
            name="stepsEyebrow"
            label={CONTENT_COPY.eyebrow}
            maxLength={ABOUT_LIMITS.eyebrow}
          />
          {Array.from({ length: ABOUT_LIMITS.steps }, (_, index) => (
            <FieldGroup key={index} title={positionLabel(CONTENT_COPY.step, index + 1)}>
              <AboutText
                name={`steps.${fieldIndex(index)}.title`}
                label={CONTENT_COPY.heading}
                maxLength={ABOUT_LIMITS.stepTitle}
              />
              <AboutText
                name={`steps.${fieldIndex(index)}.text`}
                label={CONTENT_COPY.text}
                maxLength={ABOUT_LIMITS.stepText}
                multiline
              />
            </FieldGroup>
          ))}
        </Section>
        <Section title={CONTENT_COPY.storeButton}>
          <AboutText
            name="ctaLabel"
            label={CONTENT_COPY.buttonText}
            maxLength={ABOUT_LIMITS.buttonLabel}
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
